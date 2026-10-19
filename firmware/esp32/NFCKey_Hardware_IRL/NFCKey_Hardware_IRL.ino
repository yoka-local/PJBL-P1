/**
 * ============================================================================
 * NFCKey: Sistem Absensi & Kontrol Akses Pintu (ESP32) - HARDWARE IRL VERSION
 * ============================================================================
 * Versi Khusus Pengujian Hardware Fisik / Prototipe Nyata.
 * 
 * FITUR UTAMA:
 * 1. Timer-Based Auto-Relock (Sensor Magnet / Reed Switch dinonaktifkan sementara)
 * 2. Active-LOW / Active-HIGH Relay selector untuk modul relay fisik 5V
 * 3. Serial Monitor UID Scanner (mudah membaca UID kartu fisik Anda di 115200 baud)
 * 4. Integrasi Langsung ke Cloud Supabase (REST API PostgREST)
 * 5. Offline-first: Tap tetap tersimpan jika Wi-Fi belum tersambung, dan di-sync otomatis
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

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
// CATATAN: Pin 3.3V RC522 wajib ke 3V3 ESP32 (JANGAN 5V!)

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
// STRUKTUR DATA & OBJEK GLOBAL
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

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long doorUnlockTime = 0;
static unsigned long lastReadTime = 0;
static String lastReadUid = "";
const unsigned long DEBOUNCE_DELAY_MS = 2000;

// In-Memory Queue untuk Offline Buffering (RAM)
#define QUEUE_MAX 20
static AttendanceEvent queueBuffer[QUEUE_MAX];
static int queueCount = 0;

static unsigned long lastWiFiAttempt = 0;
static unsigned long lastSyncAttempt = 0;
static bool wifiConnectedBefore = false;

// ============================================================================
// FUNGSI KONTROL PINTU & INDIKATOR
// ============================================================================
void lockDoor() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
}

void unlockDoor() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_init() {
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    lockDoor();
    currentDoorState = DoorState::LOCKED;

    Serial.println("[DOOR] Inisialisasi Door Controller selesai.");
    Serial.printf("[DOOR] Mode: TIMER AUTO-RELOCK (%d ms). Sensor magnet: NONAKTIF\n", UNLOCK_HOLD_TIME_MS);
}

void door_unlock() {
    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("[DOOR] Akses Diterima! Membuka relay solenoid...");
        unlockDoor();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        doorUnlockTime = millis();

        // Bunyi beep sukses (2 nada ceria)
        tone(PIN_BUZZER, 1800, 100);
        delay(120);
        tone(PIN_BUZZER, 2400, 150);
    }
}

void door_reject() {
    Serial.println("[DOOR] Akses Ditolak! Kartu tidak terdaftar.");
    digitalWrite(PIN_LED_RED, HIGH);
    tone(PIN_BUZZER, 400, 600); // Beep rendah panjang
    delay(600);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_update() {
    if (currentDoorState == DoorState::UNLOCKED_WAITING) {
        if (millis() - doorUnlockTime >= UNLOCK_HOLD_TIME_MS) {
            Serial.println("[DOOR] Waktu tahan habis (5 detik). Mengunci kembali relay...");
            lockDoor();
            currentDoorState = DoorState::LOCKED;
            
            // Beep halus penanda terkunci
            tone(PIN_BUZZER, 1200, 80);
        }
    }
}

// ============================================================================
// DAFTAR KARTU YANG DIIZINKAN (WHITELIST)
// ============================================================================
bool rfid_is_card_valid(const String& uid) {
    // Masukkan UID kartu / gantungan kunci fisik Anda di sini:
    // Format harus huruf besar (Uppercase) dengan titik dua (Contoh: "04:A3:92:7F")
    if (
        uid == "04:A3:92:7F" ||  // Kartu Biru default
        uid == "11:22:33:44" ||  // Kartu Preset 2
        uid == "DE:AD:BE:EF"     // Kartu Cadangan
        // Tambahkan UID kartu fisik Anda di bawah ini:
        // || uid == "XX:XX:XX:XX"
    ) {
        return true;
    }
    return false;
}

// ============================================================================
// FUNGSI RFID READER (MFRC522)
// ============================================================================
void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI dan MFRC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);
    
    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.printf("[RFID] MFRC522 Firmware Version: 0x%02X\n", version);
    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] PERINGATAN: Modul RC522 tidak terdeteksi! Periksa kabel 3.3V, GND, dan SPI (5, 18, 19, 23).");
    } else {
        Serial.println("[RFID] Modul RC522 Siap! Tempelkan kartu/fob RFID.");
    }
}

String rfid_update() {
    if (!mfrc522.PICC_IsNewCardPresent()) return "";
    if (!mfrc522.PICC_ReadCardSerial()) return "";

    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
        uidString += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) uidString += ":";
    }
    uidString.toUpperCase();
    mfrc522.PICC_HaltA();

    // Debounce agar tidak terbaca berkali-kali dalam 2 detik
    if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
        return "";
    }

    lastReadUid = uidString;
    lastReadTime = millis();

    Serial.println("\n----------------------------------------------");
    Serial.printf("[RFID] >>> KARTU TERDETEKSI: %s <<<\n", uidString.c_str());
    Serial.println("----------------------------------------------");
    return uidString;
}

// ============================================================================
// OFFLINE QUEUE MANAGER
// ============================================================================
void queue_push(const AttendanceEvent& event) {
    if (queueCount < QUEUE_MAX) {
        queueBuffer[queueCount++] = event;
        Serial.printf("[QUEUE] Event %s tersimpan di antrean (%d/%d pending)\n", event.event_id.c_str(), queueCount, QUEUE_MAX);
    } else {
        Serial.println("[QUEUE] Antrean penuh!");
    }
}

bool queue_peek(AttendanceEvent& event) {
    if (queueCount > 0) {
        event = queueBuffer[0];
        return true;
    }
    return false;
}

void queue_remove() {
    if (queueCount > 0) {
        for (int i = 0; i < queueCount - 1; i++) {
            queueBuffer[i] = queueBuffer[i + 1];
        }
        queueCount--;
    }
}

// ============================================================================
// WI-FI & SUPABASE BACKGROUND SYNC
// ============================================================================
void wifi_init() {
    Serial.printf("[WIFI] Menghubungkan ke Wi-Fi: '%s'...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWiFiAttempt = millis();
}

void wifi_update() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnectedBefore) {
            Serial.printf("[WIFI] Terhubung! IP Lokal: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
            wifiConnectedBefore = true;
        }
    } else {
        if (wifiConnectedBefore) {
            Serial.println("[WIFI] Koneksi Wi-Fi terputus. Mencoba rekoneksi...");
            wifiConnectedBefore = false;
        }
        if (millis() - lastWiFiAttempt >= 7000) {
            WiFi.reconnect();
            lastWiFiAttempt = millis();
        }
    }
}

void sync_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (queueCount == 0) return;
    if (millis() - lastSyncAttempt < 2000) return;

    lastSyncAttempt = millis();

    AttendanceEvent event;
    if (!queue_peek(event)) return;

    Serial.printf("[SYNC] Mengunggah event %s (%s) ke Supabase...\n", event.event_id.c_str(), event.card_uid.c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    StaticJsonDocument<256> doc;
    doc["event_id"] = event.event_id;
    doc["card_uid"] = event.card_uid;
    doc["device_id"] = event.device_id;
    doc["status"] = event.status;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
        if (httpResponseCode == 200 || httpResponseCode == 201 || httpResponseCode == 204) {
            Serial.printf("[SYNC] BERHASIL! Supabase mencatat event (HTTP %d).\n", httpResponseCode);
            queue_remove();
        } else {
            String responseText = http.getString();
            Serial.printf("[SYNC] Supabase merespons HTTP %d: %s\n", httpResponseCode, responseText.c_str());
            // Jika duplicate key atau error 4xx, buang dari antrean agar tidak macet
            if (httpResponseCode >= 400 && httpResponseCode < 500) {
                queue_remove();
            }
        }
    } else {
        Serial.printf("[SYNC] Gagal HTTP POST: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

// ============================================================================
// ARDUINO SETUP & LOOP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(1500);

    Serial.println("\n==============================================");
    Serial.println("  NFCKey: ESP32 Access Control & Attendance  ");
    Serial.println("         HARDWARE PROTOTYPE IRL BUILD         ");
    Serial.println("==============================================\n");

    door_init();
    rfid_init();
    wifi_init();

    // Nada boot tanda siap
    tone(PIN_BUZZER, 1000, 80);
    delay(100);
    tone(PIN_BUZZER, 1500, 80);

    Serial.println("[SYS] Prototipe Hardware Siap Digunakan!\n");
}

void loop() {
    wifi_update();

    String uid = rfid_update();
    if (uid != "") {
        bool isValid = rfid_is_card_valid(uid);
        if (isValid) {
            door_unlock();
        } else {
            door_reject();
        }

        // Simpan data absensi ke antrean lokal (langsung sync ke cloud bila ada Wi-Fi)
        AttendanceEvent event;
        event.event_id = String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        event.card_uid = uid;
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";
        
        queue_push(event);
    }

    door_update();
    sync_update();
}
