#include <Arduino.h>
#include "config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n[SYSTEM] ESP32 Starting...");
    // TODO: Initialize Wi-Fi
    // TODO: Initialize RFID reader
}

void loop() {
    // TODO: Implement state machine and main loop
}
