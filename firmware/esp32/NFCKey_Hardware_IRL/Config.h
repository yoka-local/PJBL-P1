#pragma once
#include <Arduino.h>

// ============================================================================
// 1. PENGATURAN WI-FI & KREDENSIAL SUPABASE
// ============================================================================
// Ganti dengan nama WiFi / Hotspot HP Anda untuk pengujian nyata:
#define WIFI_SSID     "NAMA_WIFI_ANDA"
#define WIFI_PASSWORD "PASSWORD_WIFI_ANDA"

#define DEVICE_ID     "GATE-01"
#define SUPABASE_URL  "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL       "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ============================================================================
// 2. PINOUT HARDWARE FISIK (ESP32 DevKit V4)
// ============================================================================
// RFID RC522 (Koneksi SPI standar ESP32)
#define PIN_RFID_SS     5    // SDA / SS pada RC522
#define PIN_RFID_SCK    18   // SCK pada RC522
#define PIN_RFID_MOSI   23   // MOSI pada RC522
#define PIN_RFID_MISO   19   // MISO pada RC522
#define PIN_RFID_RST    22   // RST pada RC522
// CATATAN PENTING: Pin 3.3V RC522 wajib ke 3V3 ESP32 (JANGAN 5V!)

// Aktuator & Indikator
#define PIN_DOOR_RELAY  26   // IN pada modul relay
#define PIN_LED_GREEN   32   // Anoda LED Hijau (lewat resistor 220 ohm)
#define PIN_LED_RED     33   // Anoda LED Merah (lewat resistor 220 ohm)
#define PIN_LED_YELLOW  25   // Anoda LED Kuning (opsional, jika dipasang)
#define PIN_BUZZER      14   // Positif (+) Buzzer 5V

// Sensor Magnet (Reed Switch)
#define PIN_REED_SWITCH 27

// ============================================================================
// 3. KONFIGURASI SENSOR & RELAY HARDWARE
// ============================================================================
// Dinonaktifkan sementara karena fisik sensor magnet belum lengkap
#define USE_DOOR_MAGNET_SENSOR false  

// Waktu pintu terbuka sebelum otomatis mengunci kembali (dalam milidetik)
#define UNLOCK_HOLD_TIME_MS    5000   // 5 Detik

// Tipe Modul Relay:
// Mayoritas modul relay 5V Arduino di pasaran adalah ACTIVE LOW:
// - LOW  = Relay Terpicu (Solenoid Terbuka / ON)
// - HIGH = Relay Mati (Solenoid Mengunci / OFF)
// Jika relay Anda terbalik (terbuka terus saat standby), ubah menjadi 'false'.
#define RELAY_ACTIVE_LOW       true

#define RELAY_TRIGGER_ON   (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_TRIGGER_OFF  (RELAY_ACTIVE_LOW ? HIGH : LOW)

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
