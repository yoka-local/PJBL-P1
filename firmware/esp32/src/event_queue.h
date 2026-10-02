#pragma once
#include <Arduino.h>

struct AttendanceEvent {
    String event_id;
    String card_uid;
    String timestamp;
    String device_id;
};

// Initialize LittleFS/SPIFFS
void queue_init();

// Push a new event to local storage
void queue_push(const AttendanceEvent& event);

// Read the oldest event (returns true if found)
bool queue_peek(AttendanceEvent& event);

// Remove a specific event after successful sync
void queue_remove(const String& event_id);

// Generate a unique event ID
String generate_event_id(const String& card_uid);

// Get ISO timestamp (from NTP or fallback)
String get_current_timestamp();
