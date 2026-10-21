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

static bool rfidReady = false;
static unsigned long lastRetryCheck = 0;

// ============================================================================
// INISIALISASI RC522
// ============================================================================
void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI Bus & MFRC522...");

    // Berikan reset pulse bersih ke pin RST dan amankan SS pin
    pinMode(PIN_RFID_SS, OUTPUT);
    digitalWrite(PIN_RFID_SS, HIGH);
    pinMode(PIN_RFID_RST, OUTPUT);
    digitalWrite(PIN_RFID_RST, LOW);
    delay(10);
    digitalWrite(PIN_RFID_RST, HIGH);
    delay(50);

    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init(PIN_RFID_SS, PIN_RFID_RST);
    delay(50);

    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.printf("[RFID] MFRC522 Firmware Version: 0x%02X\n", version);

    if (version == 0x00 || version == 0xFF) {
        rfidReady = false;
        Serial.println("\n[RFID] ⚠️ PERINGATAN: Modul RC522 BELUM TERDETEKSI (0xFF)!");
        Serial.println("[RFID] Periksa sambungan kabel fisik Anda sekarang:");
        Serial.println("  1. RC522 Pin SDA   -> ESP32 GPIO 5  (D5)  <-- HATI-HATI: Jangan ke D21/SDA!");
        Serial.println("  2. RC522 Pin SCK   -> ESP32 GPIO 18 (D18)");
        Serial.println("  3. RC522 Pin MOSI  -> ESP32 GPIO 23 (D23)");
        Serial.println("  4. RC522 Pin MISO  -> ESP32 GPIO 19 (D19)");
        Serial.println("  5. RC522 Pin IRQ   -> (Biarkan kosong / tidak dipakai)");
        Serial.println("  6. RC522 Pin GND   -> ESP32 GND");
        Serial.println("  7. RC522 Pin RST   -> ESP32 GPIO 22 (D22)");
        Serial.println("  8. RC522 Pin 3.3V  -> ESP32 3V3 (Wajib 3.3V, JANGAN 5V/VIN!)\n");
        Serial.println("[RFID] (Sistem otomatis memantau koneksi; begitu kabel diperbaiki, RC522 langsung aktif otomatis...)\n");
    } else {
        rfidReady = true;
        mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
        Serial.println("[RFID] ✅ Modul RC522 SIAP! Tempelkan kartu / gantungan kunci RFID.");
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
            mfrc522.PCD_Init(PIN_RFID_SS, PIN_RFID_RST);
            byte ver = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
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
