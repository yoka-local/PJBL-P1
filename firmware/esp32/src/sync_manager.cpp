#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sync_manager.h"
#include "event_queue.h"

static unsigned long lastSyncAttempt = 0;
const unsigned long SYNC_INTERVAL_MS = 2000; // Time between processing queue items

void sync_init() {
    LOG_SYNC("Sync manager initialized.");
}

void sync_update() {
    // Only attempt sync if Wi-Fi is connected
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    // Non-blocking wait
    if (millis() - lastSyncAttempt < SYNC_INTERVAL_MS) {
        return;
    }
    
    lastSyncAttempt = millis();

    // Peek at the queue
    AttendanceEvent event;
    if (!queue_peek(event)) {
        return; // Queue is empty
    }

    LOG_SYNC(("Syncing event " + event.event_id + " to server...").c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + API_TOKEN);
    http.addHeader("Accept", "application/json");

    StaticJsonDocument<200> doc;
    doc["event_id"] = event.event_id;
    doc["card_uid"] = event.card_uid;
    doc["timestamp"] = event.timestamp;
    doc["device_id"] = event.device_id;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
        String responseBody = http.getString();
        
        StaticJsonDocument<200> responseDoc;
        deserializeJson(responseDoc, responseBody);
        
        // Both standard success and duplicate are considered success (we can delete local copy)
        bool success = responseDoc["success"].as<bool>();
        
        if (success) {
            LOG_SYNC("Sync successful.");
            queue_remove(event.event_id);
        } else {
            LOG_SYNC(("Server rejected event: " + responseBody).c_str());
            // Depending on logic, we might want to remove it if it's a permanent 4xx error
            // For MVP, we will just log it. If it's 422, we should probably delete it to unblock the queue.
            if (httpResponseCode >= 400 && httpResponseCode < 500) {
                 queue_remove(event.event_id);
            }
        }
    } else {
        LOG_SYNC(("HTTP Request failed: " + http.errorToString(httpResponseCode)).c_str());
    }

    http.end();
}
