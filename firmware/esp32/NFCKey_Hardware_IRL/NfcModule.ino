/**
 * ============================================================================
 * MODUL: NfcModule.ino
 * Perangkat Keras: Modul NFC PN532 V3 (Red Board) - Mode SPI (Software SPI)
 * Tanggung Jawab: Inisialisasi SPI PN532, Deteksi Tag NFC/e-Money (4 & 7 bytes UID),
 *                 Auto-Reset RF Field (SAMConfig), Whitelist Lokal & Cloud Cache
 * ============================================================================
 */

#include <SPI.h>
#include <Adafruit_PN532.h>
#include "Config.h"

// Gunakan konstruktor Software SPI (Rekomendasi Resmi Adafruit untuk breakout PN532)
// Menjamin stabilitas byte-order LSB_FIRST dan clocking tanpa bug driver VSPI ESP32
Adafruit_PN532 nfc(PIN_PN532_SCK, PIN_PN532_MISO, PIN_PN532_MOSI, PIN_PN532_SS);

static unsigned long lastReadTime = 0;
static String lastReadUid = "";
static bool nfcReady = false;
static unsigned long lastRetryCheck = 0;
static unsigned long lastReadyPrompt = 0;

// Dynamic Card Whitelist Cache (Menampung kartu yang disinkronkan dari Supabase)
#define MAX_CACHED_CARDS 30
static String cachedCardList[MAX_CACHED_CARDS];
static int cachedCardCount = 0;

// ============================================================================
// DAFTAR KARTU YANG DIIZINKAN (WHITELIST LOKAL & DYNAMIC CACHE)
// ============================================================================
bool nfc_is_card_valid(const String& uid) {
    // 1. Whitelist Permanen Default
    if (
        uid == "04:A3:92:7F" ||  // Kartu Utama Siswa Teladan
        uid == "11:22:33:44" ||  // Kartu Cadangan 1
        uid == "DE:AD:BE:EF"     // Kartu Cadangan 2
    ) {
        return true;
    }

    // 2. Dynamic Cache dari Database Supabase (Offline-Ready)
    for (int i = 0; i < cachedCardCount; i++) {
        if (cachedCardList[i].equalsIgnoreCase(uid)) {
            return true;
        }
    }

    return false;
}

void nfc_add_cached_card(const String& uid) {
    if (uid.length() == 0) return;
    for (int i = 0; i < cachedCardCount; i++) {
        if (cachedCardList[i].equalsIgnoreCase(uid)) return;
    }
    if (cachedCardCount < MAX_CACHED_CARDS) {
        cachedCardList[cachedCardCount++] = uid;
        Serial.printf("[NFC] 📥 Kartu %s ditambahkan ke whitelist cache (%d/%d)\n", 
                      uid.c_str(), cachedCardCount, MAX_CACHED_CARDS);
    }
}

// ============================================================================
// RESET STATE SCANNER (Membersihkan State RF agar Selalu Siap Memindai)
// ============================================================================
void nfc_reset_scanner() {
    if (!nfcReady) return;
    nfc.SAMConfig();
    nfc.setPassiveActivationRetries(0x01);
}

// ============================================================================
// INISIALISASI MODUL NFC PN532 V3 (RED BOARD) - SPI
// ============================================================================
void nfc_init() {
    Serial.println("\n[NFC] ==============================================");
    Serial.println("[NFC] Menginisialisasi Modul NFC PN532 V3 Merah (SPI)...");
    Serial.printf("[NFC] Pinout: SCK=%d, MISO=%d, MOSI=%d, SS=%d\n",
                  PIN_PN532_SCK, PIN_PN532_MISO, PIN_PN532_MOSI, PIN_PN532_SS);
    Serial.println("[NFC] Pastikan DIP Switch PN532: Switch 1 = OFF, Switch 2 = OFF");
    Serial.println("[NFC] ==============================================");

    nfc.begin();
    delay(100);

    // Coba deteksi hingga 3 kali dengan jeda stabilisasi osilator kristal
    uint32_t versiondata = 0;
    for (int attempt = 1; attempt <= 3; attempt++) {
        versiondata = nfc.getFirmwareVersion();
        if (versiondata) {
            Serial.printf("[NFC] Percobaan ke-%d: Berhasil membaca register (0x%08X)\n", attempt, versiondata);
            break;
        }
        Serial.printf("[NFC] Percobaan ke-%d: Menunggu respons modul PN532...\n", attempt);
        delay(150);
    }

    if (!versiondata) {
        nfcReady = false;
        Serial.println("\n[NFC] ❌ GAGAL: Modul PN532 V3 belum terdeteksi!");
        Serial.println("[NFC] PANDUAN CEK HARDWARE SEKARANG:");
        Serial.println("  1. SAKELAR BIRU KECIL (DIP Switch di board PN532):");
        Serial.println("     - Sakelar 1 wajib di angka 0 (OFF / menjauhi tulisan ON)");
        Serial.println("     - Sakelar 2 wajib di angka 0 (OFF / menjauhi tulisan ON)");
        Serial.println("  2. KABEL DAYA VCC:");
        Serial.println("     - Jika dicolok ke 3V3 tidak terdeteksi, PINDAHKAN kabel VCC PN532 ke pin VIN / 5V!");
        Serial.println("       (Board PN532 merah memiliki regulator onboard 3.3V, daya 5V sering lebih optimal)");
        Serial.println("  3. SAMBUNGAN KABEL:");
        Serial.println("     - SCK  -> GPIO 18");
        Serial.println("     - MISO -> GPIO 19");
        Serial.println("     - MOSI -> GPIO 23");
        Serial.println("     - SS   -> GPIO 5");
        Serial.println("     - RSTO -> WAJIB KOSONG (JANGAN dicabut/disambung)");
        Serial.println("     - IRQ  -> KOSONG");
        Serial.println("[NFC] (Firmware akan terus mencoba mendeteksi di background tiap 2.5 detik...)\n");
    } else {
        nfcReady = true;
        Serial.printf("[NFC] ✅ BERHASIL! Chip PN5%02X Terdeteksi.\n", (versiondata >> 24) & 0xFF);
        Serial.printf("[NFC] Firmware Ver   : %d.%d\n", (versiondata >> 16) & 0xFF, (versiondata >> 8) & 0xFF);

        // Konfigurasi SAM (Normal Mode)
        nfc.SAMConfig();

        // Atur retry = 1 agar non-blocking
        nfc.setPassiveActivationRetries(0x01);

        Serial.println("[NFC] 📡 SCANNER AKTIF! Silakan tempelkan kartu / e-Money / HP NFC.\n");
        lastReadyPrompt = millis();
    }
}

// ============================================================================
// PEMBACAAN KARTU PADA LOOP UTAMA (NON-BLOCKING)
// ============================================================================
String nfc_update() {
    // 1. Auto-Reconnect jika modul belum terdeteksi saat boot
    if (!nfcReady) {
        if (millis() - lastRetryCheck >= 2500) {
            lastRetryCheck = millis();
            nfc.begin();
            uint32_t ver = nfc.getFirmwareVersion();
            if (ver) {
                nfcReady = true;
                nfc.SAMConfig();
                nfc.setPassiveActivationRetries(0x01);
                Serial.println("\n[NFC] ✅ Modul PN532 BERHASIL TERHUBUNG KEMBALI!");
                Serial.println("[NFC] 📡 Siap memindai kartu NFC sekarang.\n");
                lastReadyPrompt = millis();
            } else {
                Serial.println("[NFC] ⏳ Masih mencoba mendeteksi modul PN532...");
            }
        }
        return "";
    }

    // 2. Reminder berkala setiap 5 detik jika sistem sedang menunggu tap kartu
    if (millis() - lastReadyPrompt >= 5000 && door_get_state() == DoorState::LOCKED) {
        lastReadyPrompt = millis();
        Serial.println("[NFC] 📡 Menunggu kartu NFC... Tempelkan kartu pada reader.");
    }

    uint8_t success = 0;
    uint8_t uid[7] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength = 0;

    // Membaca kartu dengan timeout 50ms
    success = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50);

    if (success && uidLength > 0) {
        // Konversi byte UID ke string Hex format "XX:XX:XX:XX"
        String uidString = "";
        for (uint8_t i = 0; i < uidLength; i++) {
            if (uid[i] < 0x10) uidString += "0";
            uidString += String(uid[i], HEX);
            if (i < uidLength - 1) uidString += ":";
        }
        uidString.toUpperCase();

        // Debounce agar kartu yang ditempel lama tidak terbaca berulang kali
        if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
            return "";
        }

        lastReadUid = uidString;
        lastReadTime = millis();
        lastReadyPrompt = millis();

        Serial.println("\n--------------------------------------------------");
        Serial.printf("[NFC] >>> KARTU NFC TERDETEKSI: %s (%d bytes) <<<\n", 
                      uidString.c_str(), uidLength);
        Serial.println("--------------------------------------------------");

        // Segera reset SAM & retries agar medan RF segar dan siap untuk pembacaan berikutnya!
        nfc.SAMConfig();
        nfc.setPassiveActivationRetries(0x01);

        return uidString;
    }

    return "";
}

// ============================================================================
// KOMPATIBILITAS FUNGSI ANTAR-MODUL
// ============================================================================
void rfid_init() { nfc_init(); }
String rfid_update() { return nfc_update(); }
bool rfid_is_card_valid(const String& uid) { return nfc_is_card_valid(uid); }
void rfid_add_cached_card(const String& uid) { nfc_add_cached_card(uid); }
