/**
 * ============================================================================
 * NFCKey: Sistem Absensi & Kontrol Akses Pintu (ESP32)
 * Wokwi Interactive Hardware Simulation Build
 * ============================================================================
 * 
 * Hardware Disimulasikan:
 *  - ESP32 DevKit v4
 *  - RFID Reader MFRC522 (SPI: SS=5, SCK=18, MOSI=23, MISO=19, RST=22)
 *  - Modul Relay Solenoid (GPIO 26 -> Mengendalikan Solenoid Door Lock)
 *  - Indikator Solenoid Lock (LED Biru pada kontak NO-COM Relay)
 *  - Sensor Magnet Pintu / Reed Switch (GPIO 27 - Slide Switch INPUT_PULLUP)
 *  - Indikator LED Hijau (GPIO 32 - Resistor 220 Ohm - Akses Diterima)
 *  - Indikator LED Merah (GPIO 33 - Resistor 220 Ohm - Akses Ditolak)
 *  - Indikator LED Kuning (GPIO 25 - Resistor 220 Ohm - Alarm Pintu Terbuka)
 *  - Piezo Buzzer 5V (GPIO 14 - Nada Akses, Ditolak, & Alarm)
 * 
 * Fitur Simulasi:
 *  - Koneksi Wi-Fi virtual Wokwi-GUEST (Cloud Sync ke Supabase)
 *  - Heartbeat berkala ke Supabase (Dashboard website status otomatis Online)
 *  - Logging absensi langsung tercatat di tabel `attendances` Supabase
 *  - Offline Queue Buffer jika koneksi terputus
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ============================================================================
// 1. PIN CONFIGURATIONS
// ============================================================================
// RFID MFRC522 (SPI Bus)
#define PIN_RFID_SS     5
#define PIN_RFID_RST    22
#define PIN_RFID_MOSI   23
#define PIN_RFID_MISO   19
#define PIN_RFID_SCK    18

// Aktuator & Sensor
#define PIN_DOOR_RELAY  26
#define PIN_REED_SWITCH 27

// Indikator Visual & Audio
#define PIN_LED_GREEN   32
#define PIN_LED_RED     33
#define PIN_LED_YELLOW  25
#define PIN_BUZZER      14

// ============================================================================
// 2. KREDENSIAL JARINGAN & SUPABASE DIRECT REST API
// ============================================================================
// Wi-Fi virtual bawaan Wokwi:
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASSWORD ""

#define DEVICE_ID     "GATE-01"
#define SUPABASE_URL  "https://zdsmcifmlbwejyihorqs.supabase.co"
#define SUPABASE_KEY  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"
#define API_URL       "https://zdsmcifmlbwejyihorqs.supabase.co/rest/v1/attendances"

// ============================================================================
// 3. PARAMETER SISTEM & TIMER
// ============================================================================
// Set 'true' untuk simulasi penuh dengan saklar magnet pintu (Slide Switch GPIO 27)
// Set 'false' untuk mode timer auto-relock murni tanpa saklar magnet
#define USE_DOOR_MAGNET_SENSOR true

#define UNLOCK_HOLD_TIME_MS         5000   // Durasi pintu terbuka (5 detik)
#define TIMEOUT_DOOR_OPEN_MS        20000  // Alarm jika pintu dibuka > 20 detik
#define WIFI_RETRY_INTERVAL_MS      5000   // Interval coba sambung ulang Wi-Fi
#define DEBOUNCE_DELAY_MS           2000   // Anti dobel tap RFID
#define HEARTBEAT_INTERVAL_MS       20000  // Ping status online ke Supabase tiap 20s

// Logika Relay Wokwi (Wokwi Relay Module aktif saat pin IN diberi HIGH)
#define RELAY_TRIGGER_ON            HIGH
#define RELAY_TRIGGER_OFF           LOW

// ============================================================================
// 4. STRUKTUR DATA & OBJEK
// ============================================================================
enum class DoorState {
    LOCKED,
    UNLOCKED_WAITING,
    DOOR_OPEN
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
static unsigned long doorOpenedTime = 0;

static unsigned long lastReadTime = 0;
static String lastReadUid = "";

static unsigned long lastWiFiAttempt = 0;
static bool wifiWasConnected = false;

static unsigned long lastSyncAttempt = 0;
static unsigned long lastHeartbeatAttempt = 0;

// Antrean RAM Offline-First
#define QUEUE_MAX 20
static AttendanceEvent queueBuffer[QUEUE_MAX];
static int queueCount = 0;

// ============================================================================
// 5. MANAJEMEN ANTREAN EVENT (OFFLINE BUFFER)
// ============================================================================
void queue_push(const AttendanceEvent& event) {
    if (queueCount < QUEUE_MAX) {
        queueBuffer[queueCount++] = event;
        Serial.printf("[QUEUE] Event %s tersimpan di antrean (%d/%d pending)\n", event.event_id.c_str(), queueCount, QUEUE_MAX);
    } else {
        Serial.println("[QUEUE] Peringatan: Antrean buffer penuh!");
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
// 6. KONTROL HARDWARE PINTU, RELAY, & INDIKATOR
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

bool isDoorPhysicallyOpen() {
    // Pada slide switch Wokwi (INPUT_PULLUP):
    // Pin 1 ke GND, Pin 2 ke GPIO 27
    // Geser ke GND = LOW (Pintu Tertutup), Geser lepas = HIGH (Pintu Terbuka)
    return digitalRead(PIN_REED_SWITCH) == HIGH;
}

void door_init() {
    // Inisialisasi awal aman: pastikan relay OFF sebelum output aktif
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    pinMode(PIN_DOOR_RELAY, OUTPUT);

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    if (USE_DOOR_MAGNET_SENSOR) {
        pinMode(PIN_REED_SWITCH, INPUT_PULLUP);
    }

    lockDoor();
    currentDoorState = DoorState::LOCKED;

    Serial.println("[DOOR] Inisialisasi Door Controller selesai.");
    if (USE_DOOR_MAGNET_SENSOR) {
        Serial.println("[DOOR] Mode: SENSOR MAGNET LENGKAP (Slide Switch GPIO 27 Aktif)");
    } else {
        Serial.printf("[DOOR] Mode: AUTO-RELOCK TIMER (%d ms)\n", UNLOCK_HOLD_TIME_MS);
    }
}

void door_unlock() {
    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("[DOOR] Akses Diterima! Membuka relay solenoid...");
        unlockDoor();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        doorUnlockTime = millis();

        // Bunyi nada ceria 2 ketukan
        tone(PIN_BUZZER, 1800, 100);
        delay(120);
        tone(PIN_BUZZER, 2400, 150);
    }
}

void door_reject() {
    Serial.println("[DOOR] Akses Ditolak! Kartu tidak memiliki izin.");
    digitalWrite(PIN_LED_RED, HIGH);
    tone(PIN_BUZZER, 400, 600); // Beep rendah panjang
    delay(600);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_update() {
    if (!USE_DOOR_MAGNET_SENSOR) {
        // Mode tanpa sensor magnet: relock otomatis setelah UNLOCK_HOLD_TIME_MS
        if (currentDoorState == DoorState::UNLOCKED_WAITING) {
            if (millis() - doorUnlockTime >= UNLOCK_HOLD_TIME_MS) {
                Serial.println("[DOOR] Waktu habis (5s). Relay solenoid mengunci kembali.");
                lockDoor();
                currentDoorState = DoorState::LOCKED;
                tone(PIN_BUZZER, 1200, 80);
            }
        }
        return;
    }

    // Mode dengan sensor magnet (Reed Switch)
    bool isOpen = isDoorPhysicallyOpen();

    switch (currentDoorState) {
        case DoorState::LOCKED:
            lockDoor();
            if (isOpen) {
                // Pintu terbuka paksa tanpa scan kartu
                Serial.println("[ALARM] PERINGATAN: Pintu terbuka paksa saat terkunci!");
                digitalWrite(PIN_LED_RED, HIGH);
                tone(PIN_BUZZER, 1000, 200);
                currentDoorState = DoorState::DOOR_OPEN;
                doorOpenedTime = millis();
            }
            break;

        case DoorState::UNLOCKED_WAITING:
            if (isOpen) {
                Serial.println("[DOOR] Pintu fisik dibuka oleh pengguna.");
                currentDoorState = DoorState::DOOR_OPEN;
                doorOpenedTime = millis();
            } else if (millis() - doorUnlockTime >= UNLOCK_HOLD_TIME_MS) {
                Serial.println("[DOOR] Timeout: Pintu tidak dibuka dalam 5s. Mengunci kembali.");
                lockDoor();
                currentDoorState = DoorState::LOCKED;
                tone(PIN_BUZZER, 1200, 80);
            }
            break;

        case DoorState::DOOR_OPEN:
            if (!isOpen) {
                Serial.println("[DOOR] Pintu fisik ditutup kembali. Mengunci relay...");
                noTone(PIN_BUZZER);
                digitalWrite(PIN_LED_YELLOW, LOW);
                digitalWrite(PIN_LED_RED, LOW);
                lockDoor();
                currentDoorState = DoorState::LOCKED;
                tone(PIN_BUZZER, 1500, 100);
            } else if (millis() - doorOpenedTime >= TIMEOUT_DOOR_OPEN_MS) {
                // Pintu dibiarkan terbuka terlalu lama (Door Ajar Alarm)
                digitalWrite(PIN_LED_YELLOW, HIGH);
                if ((millis() / 400) % 2 == 0) {
                    tone(PIN_BUZZER, 1200);
                } else {
                    noTone(PIN_BUZZER);
                }
            }
            break;
    }
}

// ============================================================================
// 7. SUBSYSTEM RFID READER (MFRC522)
// ============================================================================
bool rfid_is_card_valid(const String& uid) {
    // Whitelist kartu:
    //  - 04:A3:92:7F : Default Kartu Biru Wokwi & Kartu Siswa Teladan
    //  - 11:22:33:44 : Kartu Hijau Preset Wokwi
    //  - DE:AD:BE:EF : Kartu Cadangan Uji Coba
    if (
        uid == "04:A3:92:7F" ||
        uid == "11:22:33:44" ||
        uid == "DE:AD:BE:EF"
    ) {
        return true;
    }
    return false;
}

void rfid_init() {
    Serial.println("[RFID] Menyiapkan SPI Bus & MFRC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);

    // Penguatan antena maksimal (+48 dB)
    mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);

    byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.printf("[RFID] MFRC522 Firmware Version: 0x%02X\n", version);
    if (version == 0x00 || version == 0xFF) {
        Serial.println("[RFID] PERINGATAN: Modul RC522 tidak terdeteksi! Periksa diagram.json.");
    } else {
        Serial.println("[RFID] Modul RC522 Siap! Klik modul RC522 di Wokwi untuk menempelkan kartu.");
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
    mfrc522.PCD_StopCrypto1();

    // Anti double-read debounce
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
// 8. WI-FI VIRTUAL & SUPABASE SYNC
// ============================================================================
void wifi_init() {
    Serial.println("[WIFI] Menghubungkan ke Wi-Fi virtual Wokwi (Wokwi-GUEST)...");
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWiFiAttempt = millis();
}

void wifi_update() {
    bool isConnected = (WiFi.status() == WL_CONNECTED);

    if (isConnected) {
        if (!wifiWasConnected) {
            Serial.printf("[WIFI] Terhubung ke Wokwi Gateway! IP: %s\n", WiFi.localIP().toString().c_str());
            wifiWasConnected = true;
        }
    } else {
        if (wifiWasConnected) {
            Serial.println("[WIFI] Koneksi Wi-Fi terputus. Mencoba rekoneksi...");
            wifiWasConnected = false;
        }
        if (millis() - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
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

    Serial.printf("[SYNC] Mengunggah event %s (%s - %s) ke Supabase...\n", 
                  event.event_id.c_str(), event.card_uid.c_str(), event.status.c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(3500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    String requestBody = "{\"event_id\":\"" + event.event_id + 
                         "\",\"card_uid\":\"" + event.card_uid + 
                         "\",\"device_id\":\"" + event.device_id + 
                         "\",\"status\":\"" + event.status + "\"}";

    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
        if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
            Serial.printf("[SYNC] BERHASIL! Supabase mencatat event absensi (HTTP %d).\n", httpCode);
            queue_remove();
        } else {
            String resp = http.getString();
            Serial.printf("[SYNC] Supabase merespons HTTP %d: %s\n", httpCode, resp.c_str());
            if (httpCode >= 400 && httpCode < 500) {
                queue_remove(); // Drop error client agar tidak menyumbat antrean
            }
        }
    } else {
        Serial.printf("[SYNC] Gagal HTTP POST: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}

void heartbeat_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (millis() - lastHeartbeatAttempt < HEARTBEAT_INTERVAL_MS && lastHeartbeatAttempt != 0) return;

    lastHeartbeatAttempt = millis();

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/devices?device_id=eq." + String(DEVICE_ID);
    http.begin(url);
    http.setTimeout(3500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    int httpCode = http.sendRequest("PATCH", "{\"status\":\"online\"}");
    if (httpCode > 0) {
        Serial.printf("[HEARTBEAT] Gateway Live Ping terkirim ke Supabase (HTTP %d)\n", httpCode);
    } else {
        Serial.printf("[HEARTBEAT] Ping gagal: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}

// ============================================================================
// 9. SETUP & MAIN LOOP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==============================================");
    Serial.println("  NFCKey: ESP32 Access Control & Attendance  ");
    Serial.println("         WOKWI VIRTUAL SIMULATOR BUILD        ");
    Serial.println("==============================================\n");

    door_init();
    rfid_init();
    wifi_init();

    // Boot melody
    tone(PIN_BUZZER, 1000, 80);
    delay(100);
    tone(PIN_BUZZER, 1500, 80);

    Serial.println("[SYS] Simulasi siap! Klik modul RC522 untuk scan kartu.\n");
}

void loop() {
    // 1. Maintain Wi-Fi
    wifi_update();

    // 2. Scan kartu RFID
    String uid = rfid_update();
    if (uid != "") {
        bool isValid = rfid_is_card_valid(uid);
        if (isValid) {
            door_unlock();
        } else {
            door_reject();
        }

        // Simpan log absensi ke antrean
        AttendanceEvent event;
        event.event_id = String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
        event.card_uid = uid;
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";

        queue_push(event);
    }

    // 3. State machine pintu & alarm magnet
    door_update();

    // 4. Sinkronisasi antrean ke Supabase
    sync_update();

    // 5. Heartbeat ping berkala agar status di Dashboard Web Realtime 'Online'
    heartbeat_update();
}
