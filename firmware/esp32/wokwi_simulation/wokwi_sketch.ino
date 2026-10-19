/**
 * ============================================================================
 * NFCKey: Sistem Absensi & Kontrol Akses Pintu (ESP32) - Wokwi Simulation
 * ============================================================================
 * Hardware Simulated:
 *  - ESP32 DevKit v4
 *  - MFRC522 RFID Reader (SPI: SS=5, SCK=18, MOSI=23, MISO=19, RST=22)
 *  - Door Lock Relay (GPIO 26)
 *  - Reed Switch / Door Magnet Sensor (GPIO 27 - Slide Switch with INPUT_PULLUP)
 *  - Buzzer (GPIO 14)
 *  - Green LED (GPIO 32 - Access Granted)
 *  - Red LED (GPIO 33 - Access Denied)
 *  - Yellow LED (GPIO 25 - Door Ajar Warning)
 *
 * Required Wokwi Libraries (add in Library Manager):
 *  - MFRC522
 *  - ArduinoJson
 * ============================================================================
 */

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// ============================================================================
// PIN CONFIGURATIONS
// ============================================================================
#define PIN_RFID_SS     5
#define PIN_RFID_RST    22
#define PIN_RFID_MOSI   23
#define PIN_RFID_MISO   19
#define PIN_RFID_SCK    18

#define PIN_DOOR_RELAY  26
#define PIN_REED_SWITCH 27

#define PIN_LED_GREEN   32
#define PIN_LED_RED     33
#define PIN_LED_YELLOW  25
#define PIN_BUZZER      14

// ============================================================================
// SYSTEM TUNABLES & CREDENTIALS
// ============================================================================
// Door Timeouts
#define TIMEOUT_UNLOCKED_WAITING_MS 10000   // 10 seconds before auto-relock
#define TIMEOUT_DOOR_OPEN_MS        30000   // 30 seconds before Door Ajar alarm

// Wi-Fi Configuration for Wokwi Virtual Gateway
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_RETRY_INTERVAL_MS 5000

// API Settings
#define DEVICE_ID "GATE-01"
#define API_URL "https://pjbl-website.vercel.app/api/attendance/tap"
#define API_TOKEN "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkc21jaWZtbGJ3ZWp5aWhvcnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyODQ4NzIsImV4cCI6MjEwNjg2MDg3Mn0.v2gNc9r0sFR9usBWaTcZhLNI_PKyb9XnMcG04ZHgqzU"

// ============================================================================
// LOGGING MACROS
// ============================================================================
#define LOG_WIFI(msg)    Serial.printf("[WIFI] %s\n", msg)
#define LOG_RFID(msg)    Serial.printf("[RFID] %s\n", msg)
#define LOG_DOOR(msg)    Serial.printf("[DOOR] %s\n", msg)
#define LOG_SYNC(msg)    Serial.printf("[SYNC] %s\n", msg)
#define LOG_SYS(msg)     Serial.printf("[SYS]  %s\n", msg)

// ============================================================================
// DATA STRUCTURES & GLOBAL OBJECTS
// ============================================================================
enum class DoorState {
    LOCKED,
    UNLOCKED_WAITING,
    DOOR_OPEN
};

struct AttendanceEvent {
    String event_id;
    String card_uid;
    String timestamp;
    String device_id;
};

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

// State variables
static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long doorStateEntryTime = 0;
static unsigned long lastReadTime = 0;
static String lastReadUid = "";
const unsigned long DEBOUNCE_DELAY_MS = 2000;

static unsigned long lastWiFiAttempt = 0;
static bool wifiWasConnected = false;

static unsigned long lastSyncAttempt = 0;
const unsigned long SYNC_INTERVAL_MS = 3000;
static bool spiffsAvailable = false;

// ============================================================================
// SUBSYSTEM: HARDWARE CONTROL & DOOR STATE MACHINE
// ============================================================================
static void lockDoorHardware() {
    digitalWrite(PIN_DOOR_RELAY, LOW);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
}

static void unlockDoorHardware() {
    digitalWrite(PIN_DOOR_RELAY, HIGH);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

static bool isDoorPhysicallyOpen() {
    // Slide switch: LOW = Closed (GND), HIGH = Open (Pullup)
    return digitalRead(PIN_REED_SWITCH) == HIGH;
}

void door_init() {
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_REED_SWITCH, INPUT_PULLUP);

    lockDoorHardware();
    currentDoorState = DoorState::LOCKED;
    LOG_DOOR("Door Controller Initialized. State: LOCKED");
}

void door_unlock() {
    if (currentDoorState == DoorState::LOCKED) {
        LOG_DOOR("Access Granted! Unlocking door...");
        unlockDoorHardware();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        doorStateEntryTime = millis();
        tone(PIN_BUZZER, 2000, 150); // Cheerful success beep
    }
}

void door_reject() {
    LOG_DOOR("Access Denied! Unauthorized card.");
    digitalWrite(PIN_LED_RED, HIGH);
    tone(PIN_BUZZER, 400, 500); // Low angry error buzz
    delay(500);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_update() {
    unsigned long timeInState = millis() - doorStateEntryTime;
    bool isOpen = isDoorPhysicallyOpen();

    switch (currentDoorState) {
        case DoorState::LOCKED:
            lockDoorHardware();
            if (isOpen) {
                LOG_DOOR("ALARM: Door forced open while locked!");
                digitalWrite(PIN_LED_RED, HIGH);
                tone(PIN_BUZZER, 1000);
                currentDoorState = DoorState::DOOR_OPEN;
                doorStateEntryTime = millis();
            }
            break;

        case DoorState::UNLOCKED_WAITING:
            if (isOpen) {
                LOG_DOOR("Door physically opened.");
                currentDoorState = DoorState::DOOR_OPEN;
                doorStateEntryTime = millis();
            } else if (timeInState >= TIMEOUT_UNLOCKED_WAITING_MS) {
                LOG_DOOR("Timeout: Door was never opened. Auto-relocking.");
                currentDoorState = DoorState::LOCKED;
                doorStateEntryTime = millis();
                lockDoorHardware();
            }
            break;

        case DoorState::DOOR_OPEN:
            if (!isOpen) {
                LOG_DOOR("Door closed. Relocking.");
                noTone(PIN_BUZZER);
                currentDoorState = DoorState::LOCKED;
                doorStateEntryTime = millis();
                lockDoorHardware();
            } else if (timeInState >= TIMEOUT_DOOR_OPEN_MS) {
                // Door open too long! (Door Ajar alarm)
                digitalWrite(PIN_LED_YELLOW, HIGH);
                if ((millis() / 500) % 2 == 0) {
                    tone(PIN_BUZZER, 1200);
                } else {
                    noTone(PIN_BUZZER);
                }
            }
            break;
    }
}

// ============================================================================
// SUBSYSTEM: RFID READER (MFRC522)
// ============================================================================
void rfid_init() {
    LOG_RFID("Initializing SPI & RC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);
    mfrc522.PCD_DumpVersionToSerial();
    LOG_RFID("RC522 Ready. Scan a card!");
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

    if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
        return "";
    }

    lastReadUid = uidString;
    lastReadTime = millis();
    LOG_RFID(("Card detected: " + uidString).c_str());
    return uidString;
}

bool rfid_is_card_valid(const String& uid) {
    // Authorized cards:
    //  - 04:A3:92:7F : Default Project Brief Card / Wokwi Blue Card
    //  - 11:22:33:44 : Wokwi Green Card Preset
    //  - DE:AD:BE:EF : Backup test card
    if (uid == "04:A3:92:7F" || uid == "11:22:33:44" || uid == "DE:AD:BE:EF") {
        return true;
    }
    return false;
}

// ============================================================================
// SUBSYSTEM: OFFLINE EVENT QUEUE (SPIFFS / RAM FALLBACK)
// ============================================================================
#define RAM_QUEUE_CAPACITY 10
static AttendanceEvent ramQueue[RAM_QUEUE_CAPACITY];
static int ramQueueCount = 0;

void queue_init() {
    LOG_SYS("Initializing storage for offline queue...");
    if (SPIFFS.begin(true)) {
        spiffsAvailable = true;
        LOG_SYS("SPIFFS mounted successfully.");
    } else {
        spiffsAvailable = false;
        LOG_SYS("SPIFFS mount failed. Falling back to In-Memory Queue.");
    }
}

String generate_event_id(const String& card_uid) {
    return String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
}

String get_current_timestamp() {
    return "2026-10-12T08:35:00+07:00";
}

void queue_push(const AttendanceEvent& event) {
    if (spiffsAvailable) {
        String filename = "/" + event.event_id + ".json";
        File file = SPIFFS.open(filename, FILE_WRITE);
        if (file) {
            StaticJsonDocument<256> doc;
            doc["event_id"] = event.event_id;
            doc["card_uid"] = event.card_uid;
            doc["timestamp"] = event.timestamp;
            doc["device_id"] = event.device_id;
            serializeJson(doc, file);
            file.close();
            LOG_SYNC(("Queued event to SPIFFS: " + event.event_id).c_str());
            return;
        }
    }

    // RAM queue fallback
    if (ramQueueCount < RAM_QUEUE_CAPACITY) {
        ramQueue[ramQueueCount++] = event;
        LOG_SYNC(("Queued event to RAM: " + event.event_id).c_str());
    } else {
        LOG_SYNC("Queue buffer full!");
    }
}

bool queue_peek(AttendanceEvent& event) {
    if (spiffsAvailable) {
        File root = SPIFFS.open("/");
        if (root) {
            File file = root.openNextFile();
            while (file) {
                String fname = file.name();
                if (fname.endsWith(".json")) {
                    StaticJsonDocument<256> doc;
                    DeserializationError error = deserializeJson(doc, file);
                    if (!error) {
                        event.event_id = doc["event_id"].as<String>();
                        event.card_uid = doc["card_uid"].as<String>();
                        event.timestamp = doc["timestamp"].as<String>();
                        event.device_id = doc["device_id"].as<String>();
                        file.close();
                        root.close();
                        return true;
                    }
                }
                file = root.openNextFile();
            }
            root.close();
        }
    }

    if (ramQueueCount > 0) {
        event = ramQueue[0];
        return true;
    }

    return false;
}

void queue_remove(const String& event_id) {
    if (spiffsAvailable) {
        String filename = "/" + event_id + ".json";
        if (SPIFFS.exists(filename)) {
            SPIFFS.remove(filename);
            LOG_SYNC(("Removed synced event from SPIFFS: " + event_id).c_str());
            return;
        }
    }

    for (int i = 0; i < ramQueueCount; i++) {
        if (ramQueue[i].event_id == event_id) {
            for (int j = i; j < ramQueueCount - 1; j++) {
                ramQueue[j] = ramQueue[j + 1];
            }
            ramQueueCount--;
            LOG_SYNC(("Removed synced event from RAM: " + event_id).c_str());
            break;
        }
    }
}

// ============================================================================
// SUBSYSTEM: WI-FI & BACKGROUND SYNC MANAGER
// ============================================================================
void wifi_init() {
    LOG_WIFI("Initializing Wi-Fi (connecting to Wokwi-GUEST)...");
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    lastWiFiAttempt = millis() - WIFI_RETRY_INTERVAL_MS;
}

void wifi_update() {
    bool isConnected = (WiFi.status() == WL_CONNECTED);

    if (isConnected) {
        if (!wifiWasConnected) {
            LOG_WIFI("Wi-Fi Connected!");
            Serial.print("[WIFI] Assigned IP: ");
            Serial.println(WiFi.localIP());
            wifiWasConnected = true;
        }
    } else {
        if (wifiWasConnected) {
            LOG_WIFI("Wi-Fi Connection Lost. Reconnecting...");
            wifiWasConnected = false;
        }
        if (millis() - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
            LOG_WIFI("Connecting to AP: Wokwi-GUEST...");
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            lastWiFiAttempt = millis();
        }
    }
}

void sync_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (millis() - lastSyncAttempt < SYNC_INTERVAL_MS) return;

    lastSyncAttempt = millis();

    AttendanceEvent event;
    if (!queue_peek(event)) return; // Queue is empty

    LOG_SYNC(("Uploading pending event " + event.event_id + " to API...").c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + API_TOKEN);
    http.addHeader("Accept", "application/json");

    StaticJsonDocument<256> doc;
    doc["event_id"] = event.event_id;
    doc["card_uid"] = event.card_uid;
    doc["timestamp"] = event.timestamp;
    doc["device_id"] = event.device_id;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
        String responseBody = http.getString();
        StaticJsonDocument<256> responseDoc;
        deserializeJson(responseDoc, responseBody);

        bool success = responseDoc["success"].as<bool>() || (httpCode == 200 || httpCode == 201);
        if (success) {
            LOG_SYNC("Upload successful! Server confirmed event.");
            queue_remove(event.event_id);
        } else {
            LOG_SYNC(("Server response: " + responseBody).c_str());
            if (httpCode >= 400 && httpCode < 500) {
                // Drop permanently invalid requests to unblock queue
                queue_remove(event.event_id);
            }
        }
    } else {
        LOG_SYNC(("HTTP POST failed: " + http.errorToString(httpCode)).c_str());
    }

    http.end();
}

// ============================================================================
// MAIN ARDUINO ENTRY POINTS
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n==============================================");
    Serial.println("  NFCKey: ESP32 Access Control & Attendance  ");
    Serial.println("         Wokwi Simulation Environment         ");
    Serial.println("==============================================\n");

    queue_init();
    door_init();
    rfid_init();
    wifi_init();

    LOG_SYS("System ready. Interactive simulation running!");
}

void loop() {
    wifi_update();

    String uid = rfid_update();
    if (uid != "") {
        if (rfid_is_card_valid(uid)) {
            door_unlock();

            AttendanceEvent event;
            event.event_id = generate_event_id(uid);
            event.card_uid = uid;
            event.timestamp = get_current_timestamp();
            event.device_id = DEVICE_ID;

            queue_push(event);
        } else {
            door_reject();
        }
    }

    door_update();
    sync_update();
}
