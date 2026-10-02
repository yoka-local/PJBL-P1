#pragma once

enum class DoorState {
    LOCKED,
    UNLOCKED_WAITING,
    DOOR_OPEN
};

// Initialize door pins (relay, reed switch, LEDs, buzzer)
void door_init();

// Non-blocking state machine to manage door locks and timeouts
void door_update();

// Call this to trigger a door unlock after a valid card tap
void door_unlock();

// Call this to reject an invalid card (beeps, red LED)
void door_reject();
