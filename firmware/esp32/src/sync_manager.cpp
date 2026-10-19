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

    LOG_SYNC(("Syncing event " + event.event_id + " to Supabase...").c_str());

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
    doc["status"] = event.status.length() > 0 ? event.status : "Diterima";

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
        if (httpResponseCode == 200 || httpResponseCode == 201 || httpResponseCode == 204) {
            LOG_SYNC("Sync to Supabase successful.");
            queue_remove(event.event_id);
        } else {
            String responseBody = http.getString();
            LOG_SYNC(("Supabase error (" + String(httpResponseCode) + "): " + responseBody).c_str());
            if (httpResponseCode >= 400 && httpResponseCode < 500) {
                // If conflict / client error, drop to unblock queue
                queue_remove(event.event_id);
            }
        }
    } else {
        LOG_SYNC(("HTTP Request failed: " + http.errorToString(httpResponseCode)).c_str());
    }

    http.end();
}
