#pragma once
#include <Arduino.h>

// ============================================================================
// 1. PENGATURAN WI-FI & KREDENSIAL DATABASE SUPABASE
// ============================================================================
// Ganti SSID & Password Wi-Fi sesuai hotspot / router Anda:
#define WIFI_SSID     "PLN nyalakan PJBLku"
#define WIFI_PASSWORD "Yorushika"

#define DEVICE_ID     "GATE-01"
#define SUPABASE_URL  "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL       "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ============================================================================
// 2. PINOUT MODUL NFC PN532 V3 (RED BOARD) - MODE SPI
// ============================================================================
// Modul PN532 V3 Merah menggunakan koneksi SPI (DIP Switch: 1=OFF, 2=OFF)
#define PIN_PN532_SS         5    // Pin SS pada modul PN532 (ke GPIO 5)
#define PIN_PN532_SCK        18   // Pin SCK pada modul PN532 (ke GPIO 18)
#define PIN_PN532_MISO       19   // Pin MISO pada modul PN532 (ke GPIO 19)
#define PIN_PN532_MOSI       23   // Pin MOSI pada modul PN532 (ke GPIO 23)
// Pin VCC  -> 3V3 ESP32
// Pin GND  -> GND ESP32
// Pin IRQ  -> Kosong (tidak digunakan)
// Pin RSTO -> WAJIB KOSONG (tidak boleh dihubungkan!)

// ============================================================================
// 3. PINOUT AKTUATOR & INDIKATOR (ESP32 32-PINS)
// ============================================================================
#define PIN_DOOR_RELAY       26   // IN pada modul relay driver solenoid
#define PIN_REED_SWITCH      27   // Sensor Reed Switch magnetik pintu (ke GND)
#define PIN_LED_GREEN        32   // Anoda LED Hijau (Akses Diterima)
#define PIN_LED_RED          33   // Anoda LED Merah (Akses Ditolak & Alarm)
#define PIN_LED_YELLOW       25   // Anoda LED Kuning (Status Wi-Fi & Door Ajar)
#define PIN_BUZZER           14   // Pin I/O (Signal / S) Modul Buzzer 3-Pin (VCC -> 5V/3V3, GND -> GND)

// ============================================================================
// 4. PARAMETER & TIMING SISTEM (Non-blocking Millis)
// ============================================================================
// Set 'false' untuk uji coba di meja kerja (timer auto-relock 5 detik)
// Set 'true' jika sudah memasang sensor reed switch fisik di kusen pintu
#define USE_DOOR_MAGNET_SENSOR      false

#define UNLOCK_HOLD_TIME_MS         5000   // Durasi buka solenoid (5 detik) sebelum relock
#define TIMEOUT_UNLOCKED_WAITING_MS 10000  // Batas waktu jika kartu valid tapi pintu tak dibuka (10s)
#define TIMEOUT_DOOR_OPEN_MS        30000  // Batas toleransi pintu terbuka sebelum alarm Door Ajar (30s)
#define DEBOUNCE_DELAY_MS           2000   // Mencegah tap berulang kartu yang sama (2 detik)
#define HEARTBEAT_TIME_MS           20000  // Interval ping online ke Supabase (20 detik)
#define CARD_SYNC_INTERVAL_MS       60000  // Interval download kartu baru dari Supabase (60s)

// Konfigurasi Polaritas Relay:
// Ubah ke 'true' jika relay Anda tipe Active LOW, atau 'false' jika Active HIGH
#define RELAY_ACTIVE_LOW            false
#define RELAY_TRIGGER_ON            (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_TRIGGER_OFF           (RELAY_ACTIVE_LOW ? HIGH : LOW)

// Konfigurasi Polaritas Modul Buzzer 3-Pin:
// Mayoritas modul buzzer 3-pin (KY-012 dll) adalah ACTIVE LOW (LOW = Bunyi, HIGH = Diam)
#define BUZZER_ACTIVE_LOW           true
#define BUZZER_TRIGGER_ON           (BUZZER_ACTIVE_LOW ? LOW : HIGH)
#define BUZZER_TRIGGER_OFF          (BUZZER_ACTIVE_LOW ? HIGH : LOW)

// ============================================================================
// 5. STRUKTUR DATA & STATE MACHINE
// ============================================================================
enum class DoorState {
    LOCKED,             // Pintu terkunci normal
    UNLOCKED_WAITING,   // Akses diterima, solenoid terbuka, menunggu pintu didorong
    DOOR_OPEN,          // Pintu sedang terbuka secara fisik (Reed Switch = OPEN)
    DOOR_AJAR,          // Pintu terbuka terlalu lama (>30s), alarm peringatan aktif
    DOOR_FORCED         // Pintu didobrak paksa tanpa otentikasi (Alarm pembobolan)
};

struct AttendanceEvent {
    String event_id;
    String card_uid;
    String device_id;
    String status;      // "Diterima" atau "Ditolak"
    String timestamp;
};

// ============================================================================
// 6. PROTOTIPE FUNGSI ANTAR-MODUL (Multi-Tab Compatibility)
// ============================================================================
// DoorModule.ino
void door_init();
void door_unlock();
void door_reject();
void door_update();
void door_alarm_reset();
bool door_is_open_physically();
DoorState door_get_state();
void led_yellow_set(bool state);
void led_yellow_blink();
void buzzer_set(bool state);
void buzzer_beep(unsigned int duration_ms);

// NfcModule.ino (PN532 V3)
void nfc_init();
String nfc_update();
bool nfc_is_card_valid(const String& uid);
void nfc_add_cached_card(const String& uid);
void nfc_reset_scanner();

// NetworkModule.ino
void wifi_init();
void wifi_update();
bool wifi_is_connected();
void queue_push(const AttendanceEvent& event);
void sync_update();
void heartbeat_update();
void card_sync_update();
