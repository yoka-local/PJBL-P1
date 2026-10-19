#pragma once

// ==========================================
// PIN CONFIGURATIONS
// ==========================================
// RFID (RC522)
#define PIN_RFID_SS    5
#define PIN_RFID_RST   22
#define PIN_RFID_MOSI  23
#define PIN_RFID_MISO  19
#define PIN_RFID_SCK   18

// DOOR & SENSORS
#define PIN_DOOR_RELAY 26
#define PIN_REED_SWITCH 27

// LED & BUZZER
#define PIN_LED_GREEN  32
#define PIN_LED_RED    33
#define PIN_LED_YELLOW 25
#define PIN_BUZZER     14

// ==========================================
// SYSTEM TUNABLES & SENSOR MODES
// ==========================================
// Set to 'false' if magnetic door sensor (reed switch) is missing/not used yet.
// In this mode, the door automatically unlocks for UNLOCK_HOLD_TIME_MS and then relocks.
// No forced open alarm or door ajar alarm will be triggered.
#define USE_DOOR_MAGNET_SENSOR false
#define UNLOCK_HOLD_TIME_MS    5000   // Door stays unlocked for 5s, then auto-relocks

// Door timeouts (active when USE_DOOR_MAGNET_SENSOR == true)
#define TIMEOUT_UNLOCKED_WAITING_MS 10000
#define TIMEOUT_DOOR_OPEN_MS        30000

// Wi-Fi (Use "Wokwi-GUEST" with empty password for Wokwi simulation)
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_RETRY_INTERVAL_MS 5000

// Supabase Direct REST API Settings
#define DEVICE_ID "GATE-01"
#define SUPABASE_URL "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ==========================================
// LOGGING CONVENTION
// ==========================================
#define LOG_WIFI(msg)    Serial.printf("[WIFI] %s\n", msg)
#define LOG_RFID(msg)    Serial.printf("[RFID] %s\n", msg)
#define LOG_DOOR(msg)    Serial.printf("[DOOR] %s\n", msg)
#define LOG_SYNC(msg)    Serial.printf("[SYNC] %s\n", msg)
#define LOG_SYS(msg)     Serial.printf("[SYS] %s\n", msg)
