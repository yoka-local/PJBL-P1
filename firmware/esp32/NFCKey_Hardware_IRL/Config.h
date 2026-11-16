#pragma once
#include <Arduino.h>

// ============================================================================
// 1. PENGATURAN WI-FI & KREDENSIAL DATABASE SUPABASE
// ============================================================================
#define WIFI_SSID     "Arche"
#define WIFI_PASSWORD "Yorushika"

#define DEVICE_ID     "GATE-01"
#define SUPABASE_URL  "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL       "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ============================================================================
// 2. PINOUT MODUL NFC PN532 V3 (RED BOARD) - MODE SPI
// ============================================================================
// Pastikan 2 Sakelar Biru Kecil (DIP Switch) pada PN532: Switch 1 = OFF, Switch 2 = OFF
#define PIN_PN532_SS         5    // Pin SS / SDA pada modul PN532 ke GPIO 5
#define PIN_PN532_SCK        18   // Pin SCK pada modul PN532 ke GPIO 18
#define PIN_PN532_MISO       19   // Pin MISO pada modul PN532 ke GPIO 19
#define PIN_PN532_MOSI       23   // Pin MOSI pada modul PN532 ke GPIO 23
// Pin VCC  -> 5V / VIN (Gunakan 5V dari output Step-Down LM2596 karena board memiliki regulator onboard 3.3V)
// Pin GND  -> GND ESP32
// Pin IRQ  -> Kosong
// Pin RSTO -> WAJIB KOSONG

// ============================================================================
// 3. PINOUT AKTUATOR & INDIKATOR (ESP32)
// ============================================================================
#define PIN_DOOR_RELAY       26   // IN pada modul relay driver solenoid
#define PIN_REED_SWITCH      27   // Sensor Reed Switch magnetik pintu (ke GND)
#define PIN_LED_GREEN        32   // Anoda LED Hijau (Akses Diterima)
#define PIN_LED_RED          33   // Anoda LED Merah (Akses Ditolak & Alarm)
#define PIN_LED_YELLOW       25   // Anoda LED Kuning (Status Wi-Fi & Door Ajar)
#define PIN_BUZZER           14   // Sinyal Buzzer (GPIO 14)

// ============================================================================
// 4. PARAMETER SISTEM & TIMING
// ============================================================================
// 4. PARAMETER & TIMING SISTEM (Dinamis dari Supabase Cloud / Website)
// ============================================================================
#define USE_DOOR_MAGNET_SENSOR              true

#define DEFAULT_UNLOCK_HOLD_TIME_MS         5000   // Durasi buka solenoid (5 detik)
#define DEFAULT_TIMEOUT_UNLOCKED_WAITING_MS 10000  // Batas waktu jika kartu valid tapi pintu tak dibuka (10s)
#define DEFAULT_TIMEOUT_DOOR_OPEN_MS        15000  // Toleransi pintu terbuka sebelum alarm Door Ajar (15 detik sesuai setting website)
#define DEFAULT_DEBOUNCE_DELAY_MS           3000   // Anti-bounce cooldown tap kartu (3 detik sesuai setting website)
#define DEFAULT_SYNC_RETRY_INTERVAL_MS      30000  // Interval drain antrean offline (30 detik)
#define HEARTBEAT_TIME_MS                   20000  // Interval ping online ke Supabase (20 detik)
#define CARD_SYNC_INTERVAL_MS               60000  // Interval sync kartu baru & settings dari Supabase (60s / 1 menit)

// Variabel timing dinamis (diupdate live dari tabel settings Supabase)
extern unsigned long unlockHoldTimeMs;
extern unsigned long timeoutDoorOpenMs;
extern unsigned long debounceDelayMs;
extern unsigned long syncRetryIntervalMs;

// ============================================================================
// 5. KONFIGURASI POLARITAS RELAY & BUZZER LEMBUT (SOFT TONE)
// ============================================================================
// RELAY SOLENOID:
// - Set 'true' (Active LOW): Untuk modul relay Low-Level Trigger ("Low Level Trigger").
//   Didorong dengan driver OUTPUT_OPEN_DRAIN ESP32:
//   Standby = HIGH (Pin mengambang/Hi-Z -> Nol arus bocor -> Relay MATI -> Solenoid TERKUNCI & KELUAR)
//   Tap Kartu = LOW (Pin sink ke GND -> Relay MENYALA -> Solenoid DITARIK MASUK)
#define RELAY_ACTIVE_LOW            true
#define RELAY_TRIGGER_ON            (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_TRIGGER_OFF           (RELAY_ACTIVE_LOW ? HIGH : LOW)

// BUZZER & VOLUME LEMBUT (SOFT TONE):
// - Active LOW buzzer (PNP S8550): LOW = Aktif, HIGH = Senyap.
#define BUZZER_ACTIVE_LOW           true
#define BUZZER_TRIGGER_ON           (BUZZER_ACTIVE_LOW ? LOW : HIGH)
#define BUZZER_TRIGGER_OFF          (BUZZER_ACTIVE_LOW ? HIGH : LOW)

// PWM Audio Lembut (Menghindari suara memekakkan telinga):
#define BUZZER_PWM_CHANNEL          0
#define BUZZER_PWM_RESOLUTION       8
// Pada Active-LOW, duty 240/255 berarti LOW hanya ~6% waktu (suara lembut/merdu).
#define BUZZER_DUTY_SOFT            240

// ============================================================================
// 6. STRUKTUR DATA & STATE MACHINE
// ============================================================================
enum class DoorState {
    LOCKED,             // Pintu terkunci normal
    UNLOCKED_WAITING,   // Akses diterima, solenoid terbuka, menunggu pintu didorong
    DOOR_OPEN,          // Pintu sedang terbuka secara fisik (Reed Switch = OPEN)
    DOOR_AJAR,          // Pintu terbuka terlalu lama, alarm peringatan aktif
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
// 7. PROTOTIPE FUNGSI ANTAR-MODUL
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
void buzzer_tone_soft(unsigned int freq);
void buzzer_mute();

// NfcModule.ino (PN532 V3)
void nfc_init();
String nfc_update();
bool nfc_is_card_valid(const String& uid);
void nfc_add_cached_card(const String& uid);
void nfc_clear_cached_cards();
void nfc_reset_scanner();

// NetworkModule.ino
void wifi_init();
void wifi_update();
bool wifi_is_connected();
void queue_push(const AttendanceEvent& event);
void sync_update();
void heartbeat_update();
void card_sync_update();
void settings_sync_update();
