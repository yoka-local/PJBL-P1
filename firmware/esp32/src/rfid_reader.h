#pragma once
#include <Arduino.h>

// Initialize the RFID reader
void rfid_init();

// Non-blocking update function to poll for cards
// If a valid tap is detected, returns the UID string (e.g., "04:A3:92:7F")
// Otherwise, returns an empty string
String rfid_update();

// Check if a card is registered and active
bool rfid_is_card_valid(const String& uid);
