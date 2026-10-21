#pragma once
#include <Arduino.h>

// ============================================================================
// 1. PENGATURAN WI-FI & KREDENSIAL DATABASE SUPABASE
// ============================================================================
// Ganti SSID & Password di bawah jika menggunakan hotspot HP lain saat pengujian:
#define WIFI_SSID     "PLN nyalakan PJBLku"
#define WIFI_PASSWORD "Yorushika"

#define DEVICE_ID     "GATE-01"
#define SUPABASE_URL  "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL       "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ============================================================================
// 2. PINOUT HARDWARE (ESP32 DevKit V1 / V4)
// ============================================================================
// RFID MFRC522 (Koneksi SPI Standar ESP32)
#define PIN_RFID_SS     5    // SDA / SS pada RC522
#define PIN_RFID_SCK    18   // SCK pada RC522
#define PIN_RFID_MOSI   23   // MOSI pada RC522
#define PIN_RFID_MISO   19   // MISO pada RC522
#define PIN_RFID_RST    22   // RST pada RC522
// PERINGATAN PENTING: VCC Modul RC522 WAJIB dihubungkan ke 3.3V ESP32 (JANGAN 5V!)

// Aktuator & Indikator LED
#define PIN_DOOR_RELAY  26   // IN pada modul relay
#define PIN_LED_GREEN   32   // Anoda LED Hijau (Akses Diterima)
#define PIN_LED_RED     33   // Anoda LED Merah (Akses Ditolak)
#define PIN_LED_YELLOW  25   // Anoda LED Kuning (Status Wi-Fi & Sistem)
#define PIN_BUZZER      14   // Positif (+) Buzzer 5V

// ============================================================================
// 3. PARAMETER SISTEM
// ============================================================================
#define UNLOCK_HOLD_TIME_MS  5000   // Durasi pintu terbuka (5 detik) sebelum mengunci kembali
#define DEBOUNCE_DELAY_MS    2000   // Mencegah tap berulang dalam 2 detik
#define HEARTBEAT_TIME_MS    20000  // Ping status online ke Supabase tiap 20 detik

// Tipe Modul Relay:
// Kebanyakan modul relay Arduino di pasaran adalah ACTIVE LOW:
// - LOW  = Relay Aktif / Terbuka
// - HIGH = Relay Mati / Mengunci
// Jika relay Anda terbalik, ubah menjadi 'false'.
#define RELAY_ACTIVE_LOW     true

#define RELAY_TRIGGER_ON     (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_TRIGGER_OFF    (RELAY_ACTIVE_LOW ? HIGH : LOW)

// ============================================================================
// 4. STRUKTUR DATA
// ============================================================================
enum class DoorState {
    LOCKED,
    UNLOCKED_WAITING
};

struct AttendanceEvent {
    String event_id;
    String card_uid;
    String device_id;
    String status; // "Diterima" atau "Ditolak"
};

// ============================================================================
// 5. PROTOTIPE FUNGSI ANTAR-MODUL (Multi-Tab Compatibility)
// ============================================================================
// DoorModule.ino
void door_init();
void door_unlock();
void door_reject();
void door_update();
void led_yellow_set(bool state);
void led_yellow_blink();

// RfidModule.ino
void rfid_init();
String rfid_update();
bool rfid_is_card_valid(const String& uid);

// NetworkModule.ino
void wifi_init();
void wifi_update();
bool wifi_is_connected();
void queue_push(const AttendanceEvent& event);
void sync_update();
void heartbeat_update();
