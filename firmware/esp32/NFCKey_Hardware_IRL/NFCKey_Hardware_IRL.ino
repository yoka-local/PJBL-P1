/**
 * ============================================================================
 * PROYEK 5 PJBL: NFCKey - Smart NFC Attendance & Door Access System
 * FIRMWARE PROTOTIPE FISIK UTAMA (NFCKey_Hardware_IRL)
 * Mikrokontroler: ESP32 (32-Pin / 30-Pin / NodeMCU-32S)
 * ============================================================================
 * 
 * Skenario Kondisi Operasional Terintegrasi:
 *  - Condition 1: Normal Operation (Tap kartu sah -> Solenoid buka -> Reed Switch Open -> Closed -> Mengunci)
 *  - Condition 2: Safe Boot (Relay aman saat boot, anti-clicking, restorasi sistem aman)
 *  - Condition 3: Access Denied (Kartu tak terdaftar -> Solenoid terkunci -> LED Merah & Audio tolak)
 *  - Condition 4: Door Ajar Alert (Pintu terbuka > 30 detik -> LED Kuning & Audio peringatan)
 *  - Condition 5: Forced Entry Alarm (Pintu didobrak tanpa tap kartu -> Sirine kencang & Strobe Merah)
 *  - Condition 6: Offline-First Operation (Tap tetap bekerja tanpa Wi-Fi -> Antrean lokal -> Sync otomatis)
 * 
 * Komunikasi Cloud:
 *  - Real-Time Database Supabase (Tabel attendances, devices, & cards)
 *  - Live Gateway Heartbeat Ping (Status GATE-01 online di Web Dashboard)
 *  - Dynamic Card Whitelist Sync (Kartu baru di web langsung aktif di alat)
 * 
 * Struktur Modular Multi-Tab:
 *  - NFCKey_Hardware_IRL.ino: Main Loop & Sistem Orkestrator
 *  - Config.h               : Pinout GPIO, SSID Wi-Fi, Kunci Supabase, & Konstanta Waktu
 *  - DoorModule.ino         : Logika Relay Solenoid, Reed Switch MC-38, & Audio/LED
 *  - NfcModule.ino          : Driver NFC PN532 V3 SPI / RC522 Auto-Probe & Whitelist Cache
 *  - NetworkModule.ino      : Non-blocking Wi-Fi, Antrean Offline, & REST API Sync
 * ============================================================================
 */

#include "Config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n========================================================");
    Serial.println("  NFCKey: ESP32 PHYSICAL PROTOTYPE FIRMWARE (32-PINS)   ");
    Serial.println("  Sistem Absensi & Kontrol Akses Pintu Cerdas (PJBL)    ");
    Serial.println("========================================================");
    Serial.println("Kondisi Didukung: Normal | Safe Boot | Reject | Ajar | Forced | Offline");
    Serial.println("Target Database : Supabase Cloud Real-Time (GATE-01)\n");

    // 1. Inisialisasi Door Controller, Relay, Reed Switch, LED, dan Buzzer (Condition 2 Safe Boot)
    door_init();

    // 2. Inisialisasi Modul Pembaca NFC PN532 V3 Merah (SPI / I2C / HSU)
    nfc_init();

    // 3. Inisialisasi Modul Wi-Fi (Non-blocking STA Mode)
    wifi_init();

    // Nada Boot Penanda Sistem Siap (Active Buzzer 5V)
    buzzer_beep(80);
    delay(100);
    buzzer_beep(120);

    Serial.println("\n[SYS] Inisialisasi selesai. Tempelkan kartu / e-Money / HP NFC pada reader!\n");
}

void loop() {
    // ------------------------------------------------------------------------
    // 1. Pemeliharaan Koneksi Wi-Fi di Background & Indikator LED Kuning
    // ------------------------------------------------------------------------
    wifi_update();

    // ------------------------------------------------------------------------
    // 2. Pembacaan Kartu NFC / e-Money (PN532 V3)
    // ------------------------------------------------------------------------
    String uid = nfc_update();
    if (uid != "") {
        bool isValid = nfc_is_card_valid(uid);

        if (isValid) {
            // CONDITION 1: Akses Diterima -> Relay Solenoid Terbuka & LED Hijau Aktif
            door_unlock();
        } else {
            // CONDITION 3: Akses Ditolak -> Relay Tetap Terkunci & LED Merah Aktif
            door_reject();
        }

        // CONDITION 6: Rekam Event Presensi ke Antrean Offline-First
        AttendanceEvent event;
        event.event_id = String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        event.card_uid = uid;
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";

        queue_push(event);
    }

    // ------------------------------------------------------------------------
    // 3. Eksekusi Mesin Status Pintu & Sensor Reed Switch (Condition 1, 4, 5)
    // ------------------------------------------------------------------------
    door_update();

    // ------------------------------------------------------------------------
    // 4. Sinkronisasi Otomatis Antrean Presensi ke Supabase REST API
    // ------------------------------------------------------------------------
    sync_update();

    // ------------------------------------------------------------------------
    // 5. Live Heartbeat Ping (Setiap 20 detik ke Supabase)
    // ------------------------------------------------------------------------
    heartbeat_update();

    // ------------------------------------------------------------------------
    // 6. Sinkronisasi Kartu Baru dari Database Supabase (Setiap 60 detik)
    // ------------------------------------------------------------------------
    card_sync_update();
}
