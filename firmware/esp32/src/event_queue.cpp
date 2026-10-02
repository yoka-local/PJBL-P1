#include <SPIFFS.h>
#include <ArduinoJson.h>
#include "config.h"
#include "event_queue.h"

// Note: For production, LittleFS is preferred over SPIFFS. 
// Using SPIFFS here for maximum Arduino compatibility on standard ESP32 boards.

const char* QUEUE_DIR = "/queue";

void queue_init() {
    LOG_SYS("Initializing SPIFFS...");
    if (!SPIFFS.begin(true)) {
        LOG_SYS("SPIFFS Mount Failed! Formatting...");
        return;
    }
    LOG_SYS("SPIFFS Mounted.");
}

String generate_event_id(const String& card_uid) {
    // Basic unique ID: DeviceID + Millis + UID Hash
    return String(DEVICE_ID) + "_" + String(millis()) + "_" + String(random(1000, 9999));
}

String get_current_timestamp() {
    // Phase 3 stub: In a full implementation, this should fetch time from NTP.
    // Since we don't have NTP implemented in this MVP skeleton yet, we use a placeholder.
    return "2026-10-02T12:00:00+07:00"; 
}

void queue_push(const AttendanceEvent& event) {
    String filename = String(QUEUE_DIR) + "/" + event.event_id + ".json";
    File file = SPIFFS.open(filename, FILE_WRITE);
    if (!file) {
        LOG_SYNC("Failed to open file for writing queue event.");
        return;
    }

    StaticJsonDocument<200> doc;
    doc["event_id"] = event.event_id;
    doc["card_uid"] = event.card_uid;
    doc["timestamp"] = event.timestamp;
    doc["device_id"] = event.device_id;

    if (serializeJson(doc, file) == 0) {
        LOG_SYNC("Failed to write event to file");
    }
    file.close();
    LOG_SYNC(("Event queued offline: " + event.event_id).c_str());
}

bool queue_peek(AttendanceEvent& event) {
    File root = SPIFFS.open(QUEUE_DIR);
    if (!root || !root.isDirectory()) {
        return false;
    }

    File file = root.openNextFile();
    if (!file) {
        return false; // Queue empty
    }

    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, file);
    if (error) {
        LOG_SYNC("Failed to read queued event, skipping.");
        file.close();
        return false;
    }

    event.event_id = doc["event_id"].as<String>();
    event.card_uid = doc["card_uid"].as<String>();
    event.timestamp = doc["timestamp"].as<String>();
    event.device_id = doc["device_id"].as<String>();
    
    file.close();
    return true;
}

void queue_remove(const String& event_id) {
    String filename = String(QUEUE_DIR) + "/" + event_id + ".json";
    if (SPIFFS.exists(filename)) {
        SPIFFS.remove(filename);
        LOG_SYNC(("Removed synced event from queue: " + event_id).c_str());
    }
}
