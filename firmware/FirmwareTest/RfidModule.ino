/**
 * ============================================================================
 * MODUL: RfidModule (MFRC522 SPI, Deteksi Kartu UID, & Validasi Whitelist)
 * ============================================================================
 */

#include <SPI.h>
#include <MFRC522.h>
#include "Config.h"

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

static unsigned long lastReadTime = 0;
static String lastReadUid = "";
static bool rfidReady = false;
static unsigned long lastRetryCheck = 0;

static byte activeSSPin = PIN_RFID_SS;
static byte activeRstPin = PIN_RFID_RST;

// ============================================================================
// DAFTAR KARTU YANG DIIZINKAN (WHITELIST LOKAL)
// ============================================================================
bool rfid_is_card_valid(const String& uid) {
    // Format UID wajib huruf besar (Uppercase) dengan titik dua (Contoh: "04:A3:92:7F")
    if (
        uid == "04:A3:92:7F" ||  // Kartu Biru default (Terdaftar atas nama Siswa Teladan di Supabase)
        uid == "11:22:33:44" ||  // Kartu Preset Cadangan 1
        uid == "DE:AD:BE:EF"     // Kartu Preset Cadangan 2
        // Tambahkan UID kartu fisik Anda di bawah ini jika ingin diizinkan:
        // || uid == "XX:XX:XX:XX"
    ) {
        return true;
    }
    return false;
}

// ============================================================================
// FUNGSI PROBE & RESET PADA KOMBINASI PIN
// ============================================================================
static byte probe_pin_combo(byte ssPin, byte rstPin) {
    pinMode(ssPin, OUTPUT);
    digitalWrite(ssPin, HIGH);

    if (rstPin != UINT8_MAX) {
        pinMode(rstPin, OUTPUT);
        digitalWrite(rstPin, LOW);
        delay(10);
        digitalWrite(rstPin, HIGH);
        delay(50); // Delay stabilisasi osilator kristal 27.12MHz
    }

    mfrc522.PCD_Init(ssPin, rstPin);
    delay(30);
    return mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
}

// ============================================================================
// INISIALISASI RC522 DENGAN AUTO-PROBING CERDAS
// ============================================================================
void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI Bus & MFRC522...");

    // Inisialisasi SPI bus tanpa SS hardware agar pin dikendalikan murni oleh MFRC522
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, -1);

    // 1. Coba pin default sesuai Config.h (GPIO 5 & GPIO 22)
    byte version = probe_pin_combo(PIN_RFID_SS, PIN_RFID_RST);
    Serial.printf("[RFID] Uji Pin Default (SS: GPIO %d, RST: GPIO %d) -> Version: 0x%02X\n", 
                  PIN_RFID_SS, PIN_RFID_RST, version);

    // 2. Jika gagal (0x00 atau 0xFF), lakukan auto-probe ke pin yang sering tertukar di ESP32
    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] 🔍 Pin default belum merespons. Mencari pin alternatif otomatis...");

        struct PinCandidate {
            byte ss;
            byte rst;
            const char* desc;
        };

        PinCandidate candidates[] = {
            { 21, 22, "Pin SDA=GPIO 21 (Label SDA ESP32), RST=GPIO 22" },
            { 4,  22, "Pin SDA=GPIO 4, RST=GPIO 22" },
            { 5,  4,  "Pin SDA=GPIO 5, RST=GPIO 4" },
            { 21, 4,  "Pin SDA=GPIO 21, RST=GPIO 4" },
            { 5,  UINT8_MAX, "Pin SDA=GPIO 5, RST ke 3.3V (Bypass RST)" },
            { 21, UINT8_MAX, "Pin SDA=GPIO 21, RST ke 3.3V (Bypass RST)" }
        };

        for (auto& cand : candidates) {
            byte v = probe_pin_combo(cand.ss, cand.rst);
            Serial.printf("[RFID]   -> Cek %-48s : 0x%02X\n", cand.desc, v);
            if (v != 0x00 && v != 0xFF) {
                version = v;
                activeSSPin = cand.ss;
                activeRstPin = cand.rst;
                Serial.println("\n==================================================");
                Serial.printf("[RFID] 🎯 DITEMUKAN! Modul RC522 terdeteksi di %s!\n", cand.desc);
                Serial.printf("[RFID] Firmware Version: 0x%02X\n", v);
                Serial.println("[RFID] Sistem otomatis mengalihkan konfigurasi ke pin ini.");
                Serial.println("==================================================\n");
                break;
            }
        }
    }

    if (version == 0x00 || version == 0xFF) {
        rfidReady = false;
        Serial.println("\n[RFID] ⚠️ PERINGATAN: Modul RC522 BELUM TERDETEKSI (0xFF)!");
        Serial.println("[RFID] Analisis Sinyal SPI:");
        Serial.println("  1. Nilai 0xFF berarti jalur MISO (GPIO 19) terbaca HIGH terus-menerus (mengambang / floating).");
        Serial.println("  2. Sambungan kabel wajib:");
        Serial.println("     - RC522 SDA  -> ESP32 GPIO 5 (atau GPIO 21)");
        Serial.println("     - RC522 SCK  -> ESP32 GPIO 18");
        Serial.println("     - RC522 MOSI -> ESP32 GPIO 23");
        Serial.println("     - RC522 MISO -> ESP32 GPIO 19");
        Serial.println("     - RC522 RST  -> ESP32 GPIO 22 (atau ke 3.3V)");
        Serial.println("     - RC522 GND  -> ESP32 GND");
        Serial.println("     - RC522 3.3V -> ESP32 3V3 (Wajib 3.3V, JANGAN 5V/VIN!)");
        Serial.println("  3. ⚠️ HEADER PIN: Pastikan pin header RC522 SUDAH DISOLDER timah. Jika hanya ditancapkan longgar, koneksi SPI akan gagal.");
        Serial.println("[RFID] (Sistem otomatis memantau koneksi di background; begitu kabel diperbaiki, RC522 langsung aktif otomatis!)\n");
    } else {
        rfidReady = true;
        mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
        Serial.printf("[RFID] ✅ Modul RC522 SIAP (Versi: 0x%02X)! Tempelkan kartu / fob RFID.\n", version);
    }
}

// ============================================================================
// PEMBACAAN KARTU PADA LOOP
// ============================================================================
String rfid_update() {
    // Jika belum terdeteksi saat boot, coba deteksi ulang tiap 2.5 detik
    if (!rfidReady) {
        if (millis() - lastRetryCheck >= 2500) {
            lastRetryCheck = millis();
            byte ver = probe_pin_combo(activeSSPin, activeRstPin);
            if (ver != 0x00 && ver != 0xFF) {
                rfidReady = true;
                mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
                Serial.println("\n==================================================");
                Serial.printf("[RFID] ✅ Modul RC522 BERHASIL TERHUBUNG! (Versi: 0x%02X)\n", ver);
                Serial.println("[RFID] Silakan tempelkan kartu RFID sekarang.");
                Serial.println("==================================================\n");
            }
        }
        return "";
    }

    if (!mfrc522.PICC_IsNewCardPresent()) return "";
    if (!mfrc522.PICC_ReadCardSerial()) return "";

    // Konversi byte UID ke string format XX:XX:XX:XX
    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
        uidString += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) uidString += ":";
    }
    uidString.toUpperCase();

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();

    // Debounce agar kartu yang sama tidak terbaca berulang kali dalam 2 detik
    if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
        return "";
    }

    lastReadUid = uidString;
    lastReadTime = millis();

    Serial.println("\n--------------------------------------------------");
    Serial.printf("[RFID] >>> KARTU TERDETEKSI: %s <<<\n", uidString.c_str());
    Serial.println("--------------------------------------------------");

    return uidString;
}
