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
// INISIALISASI RC522
// ============================================================================
void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI Bus & MFRC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);

    // Penguatan antena maksimal (+48 dB) agar kartu terbaca cepat & responsif
    mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.printf("[RFID] MFRC522 Firmware Version: 0x%02X\n", version);

    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] ⚠️ PERINGATAN: Modul RC522 TIDAK TERDETEKSI!");
        Serial.println("[RFID] Pastikan kabel: 3.3V (JANGAN 5V), GND, dan pin SPI (5, 18, 19, 23, 22) terpasang kencang.");
    } else {
        Serial.println("[RFID] Modul RC522 SIAP! Tempelkan kartu / gantungan kunci RFID.");
    }
}

// ============================================================================
// PEMBACAAN KARTU PADA LOOP
// ============================================================================
String rfid_update() {
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
