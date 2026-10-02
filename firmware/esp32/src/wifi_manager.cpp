#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "wifi_manager.h"

static unsigned long lastWiFiAttempt = 0;
static bool wasConnected = false;

void wifi_init() {
    LOG_WIFI("Initializing Wi-Fi module...");
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(); // Reset state
    delay(100);
    
    // Trigger initial connection immediately
    lastWiFiAttempt = millis() - WIFI_RETRY_INTERVAL_MS;
}

void wifi_update() {
    bool isConnected = (WiFi.status() == WL_CONNECTED);

    if (isConnected) {
        if (!wasConnected) {
            LOG_WIFI("Successfully connected!");
            Serial.print("[WIFI] IP Address: ");
            Serial.println(WiFi.localIP());
            wasConnected = true;
        }
    } else {
        if (wasConnected) {
            LOG_WIFI("Connection lost. Initiating reconnect sequence...");
            wasConnected = false;
        }

        // Non-blocking reconnect logic with backoff
        if (millis() - lastWiFiAttempt >= WIFI_RETRY_INTERVAL_MS) {
            LOG_WIFI("Attempting to connect to AP...");
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
            lastWiFiAttempt = millis();
        }
    }
}
