#include <Arduino.h>
#include "config.h"
#include "wifi_manager.h"

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println();
    
    LOG_SYS("NexusGate ESP32 Starting...");
    LOG_SYS("Phase 1: ESP32 Bring-Up");

    // Initialize subsystems
    wifi_init();
    
    // TODO: Initialize RFID reader
}

void loop() {
    // Keep Wi-Fi connection alive (non-blocking)
    wifi_update();
    
    // TODO: Implement door state machine
    // TODO: Implement RFID polling
}
