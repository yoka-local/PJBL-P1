/**
 * ============================================================================
 * NFCKey: ESP32 Access Control & Attendance System
 * MODUL PENGUJIAN PERANGKAT KERAS FISIK (FirmwareTest)
 * ============================================================================
 * 
 * Fitur yang Diuji dalam Build Ini:
 *  1. Deteksi Kartu NFC / RFID MFRC522 (Format UID: "XX:XX:XX:XX")
 *  2. Koneksi Wi-Fi ke Jaringan Nyata ("PJBLSimulation" / "Yorushika")
 *  3. Koneksi Langsung ke Database Supabase Cloud (Tabel attendances & devices)
 *  4. Kontrol Modul Relay Solenoid (Active LOW, Auto-Relock 5 Detik)
 *  5. Tiga Indikator LED Fisik:
 *     - LED Hijau  (GPIO 32) : Akses Diterima (Relay Terbuka)
 *     - LED Merah  (GPIO 33) : Akses Ditolak (Kartu Tidak Terdaftar)
 *     - LED Kuning (GPIO 25) : Status Wi-Fi (Kedip = Menghubungkan, Solid = Siap)
 * 
 * Struktur Kode Terpisah (Modular Multi-Tab):
 *  - FirmwareTest.ino   : Setup & Loop Utama (Orkestrator)
 *  - Config.h           : Konfigurasi Pinout, Wi-Fi, Supabase, & Whitelist
 *  - RfidModule.ino     : Pembacaan SPI RC522 & Pengecekan UID Kartu
 *  - DoorModule.ino     : Logika Relay, LED Merah, Hijau, Kuning, & Buzzer
 *  - NetworkModule.ino  : Koneksi Wi-Fi, Antrean Offline, & Sinkronisasi Supabase
 * ============================================================================
 */

#include "Config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n========================================================");
    Serial.println("     NFCKey: ESP32 HARDWARE TESTING SUITE BUILD         ");
    Serial.println("  Fitur: NFC UID, Wi-Fi, Supabase, Relay, LED R/G/Y    ");
    Serial.println("========================================================\n");

    // 1. Inisialisasi modul aktuator, LED, dan buzzer
    door_init();

    // 2. Inisialisasi RFID reader MFRC522 (SPI)
    rfid_init();

    // 3. Inisialisasi koneksi Wi-Fi
    wifi_init();

    // Nada boot penanda sistem siap
    tone(PIN_BUZZER, 1000, 80);
    delay(100);
    tone(PIN_BUZZER, 1600, 100);

    Serial.println("\n[SYS] Inisialisasi selesai. Tempelkan kartu RFID pada reader!\n");
}

void loop() {
    // 1. Kelola koneksi Wi-Fi di background & update LED Kuning
    wifi_update();

    // 2. Deteksi kartu RFID saat ditempelkan
    String uid = rfid_update();
    if (uid != "") {
        bool isValid = rfid_is_card_valid(uid);

        if (isValid) {
            // Kartu terdaftar: Buka relay solenoid & nyalakan LED Hijau
            door_unlock();
        } else {
            // Kartu asing / ditolak: Nyalakan LED Merah & bunyikan nada tolak
            door_reject();
        }

        // 3. Rekam event absensi ke antrean (Offline-first)
        AttendanceEvent event;
        event.event_id = String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        event.card_uid = uid;
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";

        queue_push(event);
    }

    // 4. Update timer auto-relock relay (Mengunci otomatis setelah 5 detik)
    door_update();

    // 5. Sinkronisasi antrean log ke database Supabase
    sync_update();

    // 6. Kirim heartbeat status gateway ke Supabase tiap 20 detik
    heartbeat_update();
}
