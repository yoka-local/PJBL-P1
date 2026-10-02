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
// SYSTEM TUNABLES
// ==========================================
// Door timeouts
#define TIMEOUT_UNLOCKED_WAITING_MS 10000
#define TIMEOUT_DOOR_OPEN_MS        30000

// Wi-Fi
#define WIFI_SSID "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define WIFI_RETRY_INTERVAL_MS 5000 // Initial backoff interval

// API Settings
#define DEVICE_ID "GATE-01"
#define API_URL "http://192.168.1.100:8000/api/attendance/tap"
#define API_TOKEN "your_sanctum_token_here"

// ==========================================
// LOGGING CONVENTION
// ==========================================
#define LOG_WIFI(msg)    Serial.printf("[WIFI] %s\n", msg)
#define LOG_RFID(msg)    Serial.printf("[RFID] %s\n", msg)
#define LOG_DOOR(msg)    Serial.printf("[DOOR] %s\n", msg)
#define LOG_SYNC(msg)    Serial.printf("[SYNC] %s\n", msg)
#define LOG_SYS(msg)     Serial.printf("[SYS] %s\n", msg)
