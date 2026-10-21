/**
 * ============================================================================
 * NFCKey: Sistem Absensi & Kontrol Akses Pintu (ESP32)
 * Modul Utama (Main Orchestrator)
 * ============================================================================
 * 
 * Struktur Kode Terpisah (Modular Multi-Tab):
 * - NFCKey_Hardware_IRL.ino : Alur program utama (setup & loop)
 * - Config.h                : Konfigurasi pinout, WiFi, Supabase, & mode sensor
 * - DoorController.ino      : Kontrol modul relay, solenoid, LED, & buzzer
 * - RfidReader.ino          : Inisialisasi SPI MFRC522 & whitelist kartu
 * - NetworkSync.ino         : Koneksi WiFi & sinkronisasi data ke Supabase Cloud
 * ============================================================================
 */

#include "Config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==============================================");
    Serial.println("  NFCKey: ESP32 Access Control & Attendance  ");
    Serial.println("         HARDWARE PROTOTYPE IRL BUILD         ");
    Serial.println("==============================================\n");

    door_init();
    rfid_init();
    wifi_init();

    // Nada boot penanda siap
    tone(PIN_BUZZER, 1000, 80);
    delay(100);
    tone(PIN_BUZZER, 1500, 80);

    Serial.println("[SYS] Prototipe Hardware Siap Digunakan!\n");
}

void loop() {
    // 1. Kelola koneksi Wi-Fi di background
    wifi_update();

    // 2. Deteksi kartu RFID saat ditempelkan
    String uid = rfid_update();
    if (uid != "") {
        bool isValid = rfid_is_card_valid(uid);
        if (isValid) {
            door_unlock();
        } else {
            door_reject();
        }

        // Catat data absensi (otomatis disinkronkan ke Supabase jika Wi-Fi terhubung)
        AttendanceEvent event;
        event.event_id = String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        event.card_uid = uid;
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";
        
        queue_push(event);
    }

    // 3. Perbarui state machine pintu (Auto-relock setelah 5 detik)
    door_update();

    // 4. Sinkronisasi antrean log ke database Supabase
    sync_update();

    // 5. Heartbeat status gateway ke Supabase
    heartbeat_update();
}
