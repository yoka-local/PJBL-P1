/**
 * ============================================================================
 * MODUL: RfidReader (MFRC522 SPI & Whitelist Validation)
 * ============================================================================
 */

#include <SPI.h>
#include <MFRC522.h>
#include "Config.h"

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

static unsigned long lastReadTime = 0;
static String lastReadUid = "";
const unsigned long DEBOUNCE_DELAY_MS = 2000;

// Daftar Kartu yang Diizinkan (Whitelist)
bool rfid_is_card_valid(const String& uid) {
    // Masukkan UID kartu / gantungan kunci fisik Anda di sini:
    // Format harus huruf besar (Uppercase) dengan titik dua (Contoh: "04:A3:92:7F")
    if (
        uid == "04:A3:92:7F" ||  // Kartu Biru default
        uid == "11:22:33:44" ||  // Kartu Preset 2
        uid == "DE:AD:BE:EF"     // Kartu Cadangan
        // Tambahkan UID kartu fisik Anda di bawah ini:
        // || uid == "XX:XX:XX:XX"
    ) {
        return true;
    }
    return false;
}

void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI dan MFRC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);
    
    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.printf("[RFID] MFRC522 Firmware Version: 0x%02X\n", version);
    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] PERINGATAN: Modul RC522 tidak terdeteksi! Periksa kabel 3.3V, GND, dan SPI (5, 18, 19, 23).");
    } else {
        Serial.println("[RFID] Modul RC522 Siap! Tempelkan kartu/fob RFID.");
    }
}

String rfid_update() {
    if (!mfrc522.PICC_IsNewCardPresent()) return "";
    if (!mfrc522.PICC_ReadCardSerial()) return "";

    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
        uidString += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) uidString += ":";
    }
    uidString.toUpperCase();
    mfrc522.PICC_HaltA();

    // Debounce agar tidak terbaca berkali-kali dalam 2 detik
    if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
        return "";
    }

    lastReadUid = uidString;
    lastReadTime = millis();

    Serial.println("\n----------------------------------------------");
    Serial.printf("[RFID] >>> KARTU TERDETEKSI: %s <<<\n", uidString.c_str());
    Serial.println("----------------------------------------------");
    return uidString;
}
