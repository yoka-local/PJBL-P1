#include <Arduino.h>
#include "config.h"
#include "wifi_manager.h"
#include "rfid_reader.h"
#include "door_controller.h"
#include "event_queue.h"
#include "sync_manager.h"

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println();
    
    LOG_SYS("NFCKey ESP32 Starting...");

    // Initialize subsystems
    queue_init();
    door_init();
    rfid_init();
    wifi_init();
    sync_init();
}

void loop() {
    // 1. Maintain Wi-Fi connection
    wifi_update();
    
    // 2. Poll RFID reader for cards
    String uid = rfid_update();
    
    // 3. Process new card tap
    if (uid != "") {
        bool isValid = rfid_is_card_valid(uid);
        if (isValid) {
            door_unlock();
        } else {
            door_reject();
        }

        // Create Event and Queue it (Offline First!)
        AttendanceEvent event;
        event.event_id = generate_event_id(uid);
        event.card_uid = uid;
        event.timestamp = get_current_timestamp();
        event.device_id = DEVICE_ID;
        event.status = isValid ? "Diterima" : "Ditolak";
        
        queue_push(event);
    }
    
    // 4. Update door state machine (handles timeouts and reed switch)
    door_update();
    
    // 5. Background sync queue to server
    sync_update();
}
