/**
 * ============================================================================
 * MODUL: DoorModule (Kontrol Relay Solenoid, LED Merah, Hijau, Kuning, & Buzzer)
 * ============================================================================
 */

#include "Config.h"

static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long doorUnlockTime = 0;

static void lockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    digitalWrite(PIN_LED_GREEN, LOW);
}

static void unlockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

// ============================================================================
// KONTROL LED KUNING (STATUS WI-FI & SISTEM)
// ============================================================================
void led_yellow_set(bool state) {
    digitalWrite(PIN_LED_YELLOW, state ? HIGH : LOW);
}

void led_yellow_blink() {
    static unsigned long lastBlink = 0;
    static bool blinkState = false;
    if (millis() - lastBlink >= 250) {
        lastBlink = millis();
        blinkState = !blinkState;
        digitalWrite(PIN_LED_YELLOW, blinkState ? HIGH : LOW);
    }
}

// ============================================================================
// INISIALISASI PERANGKAT OUTPUT
// ============================================================================
void door_init() {
    // Tulis status OFF sebelum pinMode agar relay tidak berbunyi/terpicu sesaat saat booting
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    pinMode(PIN_DOOR_RELAY, OUTPUT);

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    lockRelayHardware();
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);

    currentDoorState = DoorState::LOCKED;

    Serial.println("[DOOR] Inisialisasi Door Module & LED selesai.");
    Serial.printf("[DOOR] Auto-Relock Timer: %d ms | Relay Polarity: %s\n", 
                  UNLOCK_HOLD_TIME_MS, RELAY_ACTIVE_LOW ? "ACTIVE LOW" : "ACTIVE HIGH");
}

// ============================================================================
// AKSI BUKA PINTU (AKSES DITERIMA)
// ============================================================================
void door_unlock() {
    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("[DOOR] ✅ AKSI: Akses Diterima! Relay Solenoid TERBUKA.");
        unlockRelayHardware();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        doorUnlockTime = millis();

        // Indikasi Audio: 2 nada ceria
        tone(PIN_BUZZER, 1800, 100);
        delay(120);
        tone(PIN_BUZZER, 2400, 150);
    }
}

// ============================================================================
// AKSI TOLAK PINTU (AKSES DITOLAK)
// ============================================================================
void door_reject() {
    Serial.println("[DOOR] ❌ AKSI: Akses Ditolak! Kartu tidak terdaftar.");
    digitalWrite(PIN_LED_RED, HIGH);
    
    // Indikasi Audio: Beep rendah panjang
    tone(PIN_BUZZER, 400, 600);
    delay(600);
    digitalWrite(PIN_LED_RED, LOW);
}

// ============================================================================
// AUTO-RELOCK STATE MACHINE
// ============================================================================
void door_update() {
    if (currentDoorState == DoorState::UNLOCKED_WAITING) {
        if (millis() - doorUnlockTime >= UNLOCK_HOLD_TIME_MS) {
            Serial.println("[DOOR] 🔒 Waktu habis (5 detik). Relay Solenoid MENGUNCI KEMBALI.");
            lockRelayHardware();
            currentDoorState = DoorState::LOCKED;

            // Beep halus penanda terkunci
            tone(PIN_BUZZER, 1200, 80);
        }
    }
}
