/**
 * ============================================================================
 * MODUL: DoorController (Kontrol Relay, LED, & Buzzer)
 * ============================================================================
 */

#include "Config.h"

static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long doorUnlockTime = 0;

void lockDoor() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
}

void unlockDoor() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_init() {
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    lockDoor();
    currentDoorState = DoorState::LOCKED;

    Serial.println("[DOOR] Inisialisasi Door Controller selesai.");
    Serial.printf("[DOOR] Mode: TIMER AUTO-RELOCK (%d ms). Sensor magnet: NONAKTIF\n", UNLOCK_HOLD_TIME_MS);
}

void door_unlock() {
    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("[DOOR] Akses Diterima! Membuka relay solenoid...");
        unlockDoor();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        doorUnlockTime = millis();

        // Bunyi beep sukses (2 nada ceria)
        tone(PIN_BUZZER, 1800, 100);
        delay(120);
        tone(PIN_BUZZER, 2400, 150);
    }
}

void door_reject() {
    Serial.println("[DOOR] Akses Ditolak! Kartu tidak terdaftar.");
    digitalWrite(PIN_LED_RED, HIGH);
    tone(PIN_BUZZER, 400, 600); // Beep rendah panjang
    delay(600);
    digitalWrite(PIN_LED_RED, LOW);
}

void door_update() {
    if (currentDoorState == DoorState::UNLOCKED_WAITING) {
        if (millis() - doorUnlockTime >= UNLOCK_HOLD_TIME_MS) {
            Serial.println("[DOOR] Waktu tahan habis (5 detik). Mengunci kembali relay...");
            lockDoor();
            currentDoorState = DoorState::LOCKED;
            
            // Beep halus penanda terkunci
            tone(PIN_BUZZER, 1200, 80);
        }
    }
}
