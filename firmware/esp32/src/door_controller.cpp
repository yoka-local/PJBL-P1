#include <Arduino.h>
#include "config.h"
#include "door_controller.h"

static DoorState currentState = DoorState::LOCKED;
static unsigned long stateEntryTime = 0;

// Hardware abstractions
static void lockDoor() {
    digitalWrite(PIN_DOOR_RELAY, LOW); // Assuming LOW = locked
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
}

static void unlockDoor() {
    digitalWrite(PIN_DOOR_RELAY, HIGH); // Assuming HIGH = unlocked
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

static bool isDoorPhysicallyOpen() {
    // Assuming reed switch is connected with pullup, so LOW = magnet near (closed), HIGH = open
    return digitalRead(PIN_REED_SWITCH) == HIGH;
}

void door_init() {
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    
    // Internal pullup for reed switch if needed (adjust based on actual hardware)
    pinMode(PIN_REED_SWITCH, INPUT_PULLUP); 

    lockDoor();
    currentState = DoorState::LOCKED;
    LOG_DOOR("Door controller initialized. Status: LOCKED");
}

void door_unlock() {
    if (currentState == DoorState::LOCKED) {
        LOG_DOOR("Access Granted. Unlocking door...");
        unlockDoor();
        currentState = DoorState::UNLOCKED_WAITING;
        stateEntryTime = millis();
        
        // Short beep for success
        tone(PIN_BUZZER, 2000, 100); 
    }
}

void door_reject() {
    if (currentState == DoorState::LOCKED) {
        LOG_DOOR("Access Denied.");
        digitalWrite(PIN_LED_RED, HIGH);
        
        // Long angry beep
        tone(PIN_BUZZER, 500, 500); 
        
        // Note: In a fully non-blocking setup, we'd use a timer to turn off the red LED.
        // For simplicity here, we'll let it stay on until the next loop tick clears it (or add a small timer).
        // Let's do a quick blocking delay just for the reject animation to keep it simple, 
        // since it doesn't affect the door state machine.
        delay(500); 
        digitalWrite(PIN_LED_RED, LOW);
    }
}

void door_update() {
    unsigned long timeInState = millis() - stateEntryTime;
    bool isOpen = isDoorPhysicallyOpen();

    switch (currentState) {
        case DoorState::LOCKED:
            // Ensure lock is engaged
            lockDoor();
            
            // If the door is forced open while locked!
            if (isOpen) {
                LOG_DOOR("WARNING: DOOR FORCED OPEN!");
                digitalWrite(PIN_LED_RED, HIGH);
                tone(PIN_BUZZER, 1000); // Continuous tone
                currentState = DoorState::DOOR_OPEN;
                stateEntryTime = millis();
            }
            break;

        case DoorState::UNLOCKED_WAITING:
            if (isOpen) {
                LOG_DOOR("Door opened.");
                currentState = DoorState::DOOR_OPEN;
                stateEntryTime = millis();
            } else if (timeInState >= TIMEOUT_UNLOCKED_WAITING_MS) {
                LOG_DOOR("Door never opened. Relocking.");
                currentState = DoorState::LOCKED;
                stateEntryTime = millis();
                lockDoor();
            }
            break;

        case DoorState::DOOR_OPEN:
            if (!isOpen) {
                LOG_DOOR("Door closed. Locking.");
                noTone(PIN_BUZZER);
                currentState = DoorState::LOCKED;
                stateEntryTime = millis();
                lockDoor();
            } else if (timeInState >= TIMEOUT_DOOR_OPEN_MS) {
                // Door open too long!
                digitalWrite(PIN_LED_YELLOW, HIGH);
                // Beep repeatedly (non-blocking beep logic could be added here, 
                // for now just steady tone or alternate)
                if ((millis() / 500) % 2 == 0) {
                    tone(PIN_BUZZER, 1000);
                } else {
                    noTone(PIN_BUZZER);
                }
            }
            break;
    }
}
