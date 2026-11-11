/**
 * ============================================================================
 * MODUL: DoorModule.ino
 * Tanggung Jawab: Kontrol Relay Solenoid, Reed Switch Pintu, LED & Audio Feedback
 * Mengimplementasikan 6 Skenario Kondisi Operasional (Condition 1 s.d. 5)
 * ============================================================================
 */

#include "Config.h"

static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long stateEntryTime = 0;
static bool lastReedRawClosed = true;

// Timing non-blocking untuk buzzer & strobe LED
static unsigned long lastToneToggle = 0;
static bool toneToggleState = false;

// Hardware Low-Level Abstractions
static void lockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    digitalWrite(PIN_LED_GREEN, LOW);
}

static void unlockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

DoorState door_get_state() {
    return currentDoorState;
}

// ============================================================================
// PEMBACAAN SENSOR MAGNETIK REED SWITCH (MC-38)
// ============================================================================
// Dengan INPUT_PULLUP:
// - Magnet menempel (Pintu TERTUTUP) -> Kontak switch menghubungkan pin ke GND -> LOW
// - Magnet menjauh (Pintu TERBUKA)   -> Kontak switch terputus -> HIGH (Pull-up)
bool door_is_open_physically() {
    if (!USE_DOOR_MAGNET_SENSOR) return false;
    return (digitalRead(PIN_REED_SWITCH) == HIGH);
}

// ============================================================================
// KONTROL LED KUNING (STATUS WI-FI & DOOR AJAR)
// ============================================================================
void led_yellow_set(bool state) {
    if (currentDoorState != DoorState::DOOR_AJAR) {
        digitalWrite(PIN_LED_YELLOW, state ? HIGH : LOW);
    }
}

void led_yellow_blink() {
    static unsigned long lastBlink = 0;
    static bool blinkState = false;
    if (currentDoorState == DoorState::DOOR_AJAR) return; // Mode ajar mengontrol LED secara khusus

    if (millis() - lastBlink >= 300) {
        lastBlink = millis();
        blinkState = !blinkState;
        digitalWrite(PIN_LED_YELLOW, blinkState ? HIGH : LOW);
    }
}

// Kontrol Modul Buzzer 3-Pin (Mendukung Active LOW & Active HIGH)
void buzzer_set(bool state) {
    digitalWrite(PIN_BUZZER, state ? BUZZER_TRIGGER_ON : BUZZER_TRIGGER_OFF);
}

void buzzer_beep(unsigned int duration_ms) {
    buzzer_set(true);
    delay(duration_ms);
    buzzer_set(false);
}

// ============================================================================
// INISIALISASI PERANGKAT KERAS (CONDITION 2: SAFE BOOT)
// ============================================================================
void door_init() {
    // 1. Tulis status OFF sebelum pinMode agar relay tidak clicking/bergerak liar saat booting
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    pinMode(PIN_DOOR_RELAY, OUTPUT);

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);

    // Inisialisasi Buzzer (Tulis OFF sebelum pinMode agar buzzer Active LOW tidak berbunyi liar saat idle)
    digitalWrite(PIN_BUZZER, BUZZER_TRIGGER_OFF);
    pinMode(PIN_BUZZER, OUTPUT);
    buzzer_set(false);

    lockRelayHardware();
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);

    if (USE_DOOR_MAGNET_SENSOR) {
        pinMode(PIN_REED_SWITCH, INPUT_PULLUP);
        delay(20);
        // Baca status fisik awal pintu
        lastReedRawClosed = !door_is_open_physically();
        Serial.printf("[DOOR] Inisialisasi Door Controller & Reed Switch selesai. Status fisik: %s\n",
                      lastReedRawClosed ? "TERTUTUP (CLOSED)" : "TERBUKA (OPEN)");
    } else {
        Serial.println("[DOOR] Inisialisasi Door Controller selesai (Mode Timer Auto-Relock).");
    }

    currentDoorState = DoorState::LOCKED;
    stateEntryTime = millis();
}

// ============================================================================
// AKSI BUKA PINTU (CONDITION 1: AKSES DITERIMA)
// ============================================================================
void door_unlock() {
    // Jika sedang dalam status forced alarm, tap kartu sah dapat mematikan alarm
    if (currentDoorState == DoorState::DOOR_FORCED || currentDoorState == DoorState::DOOR_AJAR) {
        door_alarm_reset();
    }

    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("\n[DOOR] ==============================================");
        Serial.println("[DOOR]  AKSI: Akses Diterima! Solenoid TERBUKA (UNLOCKED)");
        Serial.println("[DOOR] ==============================================");

        unlockRelayHardware();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        stateEntryTime = millis();

        // Indikasi Audio: 2 beep ceria
        buzzer_beep(100);
        delay(80);
        buzzer_beep(150);
    }
}

// ============================================================================
// AKSI PENOLAKAN AKSES (CONDITION 3: ACCESS DENIED)
// ============================================================================
void door_reject() {
    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("\n[DOOR] ❌ AKSI: Akses Ditolak! Solenoid Tetap Terkunci.");
        digitalWrite(PIN_LED_RED, HIGH);

        // Indikasi Audio: Beep panjang peringatan
        buzzer_set(true);
        delay(600);
        buzzer_set(false);
        digitalWrite(PIN_LED_RED, LOW);
    }
}

// ============================================================================
// RESET ALARM PEMBOBOLAN / AJAR
// ============================================================================
void door_alarm_reset() {
    buzzer_set(false);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);
    lockRelayHardware();
    currentDoorState = DoorState::LOCKED;
    stateEntryTime = millis();
    Serial.println("[DOOR] 🔕 Alarm dinonaktifkan. Sistem kembali ke status LOCKED.");
}

// ============================================================================
// MESIN STATUS PINTU (DOOR STATE MACHINE - NON-BLOCKING)
// ============================================================================
void door_update() {
    unsigned long timeInState = millis() - stateEntryTime;
    bool isPhysicallyOpen = door_is_open_physically();
    bool isClosed = !isPhysicallyOpen;

    // ------------------------------------------------------------------------
    // Mode Tanpa Reed Switch (Timer-based Auto-Relock)
    // ------------------------------------------------------------------------
    if (!USE_DOOR_MAGNET_SENSOR) {
        if (currentDoorState == DoorState::UNLOCKED_WAITING) {
            if (timeInState >= UNLOCK_HOLD_TIME_MS) {
                Serial.printf("[DOOR] 🔒 Waktu habis (%d ms). Solenoid MENGUNCI KEMBALI.\n", UNLOCK_HOLD_TIME_MS);
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                nfc_reset_scanner();
                buzzer_beep(80);
            }
        }
        return;
    }

    // ------------------------------------------------------------------------
    // Mode Lengkap dengan Sensor Magnetik Reed Switch (MC-38)
    // ------------------------------------------------------------------------
    switch (currentDoorState) {
        case DoorState::LOCKED:
            lockRelayHardware();

            // CONDITION 5: Deteksi Pembobolan Paksa (Forced Entry)
            // Terjadi jika pintu tadinya tertutup (CLOSED), lalu tiba-tiba TERBUKA tanpa otentikasi RFID!
            if (lastReedRawClosed && isPhysicallyOpen) {
                Serial.println("\n[SECURITY ALARM] 🚨 PERINGATAN: PINTU DIBOBOL PAKSA (DOOR FORCED OPEN)!");
                currentDoorState = DoorState::DOOR_FORCED;
                stateEntryTime = millis();
                lastToneToggle = millis();
            }
            break;

        case DoorState::UNLOCKED_WAITING:
            // Skenario A: Pintu didorong terbuka oleh siswa (Normal flow)
            if (isPhysicallyOpen) {
                Serial.println("[DOOR] 🚪 Pintu fisik didorong terbuka (DOOR_OPEN).");
                currentDoorState = DoorState::DOOR_OPEN;
                stateEntryTime = millis();
            }
            // Skenario B: Kartu di-tap tapi pintu tidak pernah dibuka sampai batas waktu
            else if (timeInState >= TIMEOUT_UNLOCKED_WAITING_MS) {
                Serial.println("[DOOR] 🔒 Pintu tidak pernah dibuka. Auto-relock diaktifkan kembali.");
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                nfc_reset_scanner();
                buzzer_beep(100);
            }
            break;

        case DoorState::DOOR_OPEN:
            // Skenario A: Siswa telah masuk dan menutup pintu kembali -> Langsung Mengunci!
            if (isClosed) {
                Serial.println("[DOOR] 🔒 Pintu ditutup kembali. Solenoid MENGUNCI KEMBALI.");
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                nfc_reset_scanner();
                buzzer_beep(100);
            }
            // CONDITION 4: Pintu diganjal / terbuka terlalu lama (> 30 detik)
            else if (timeInState >= TIMEOUT_DOOR_OPEN_MS) {
                Serial.println("\n[DOOR] ⚠️ PERINGATAN: Pintu terbuka lebih dari 30 detik! (DOOR AJAR ALERT)");
                currentDoorState = DoorState::DOOR_AJAR;
                stateEntryTime = millis();
                lastToneToggle = millis();
            }
            break;

        case DoorState::DOOR_AJAR:
            // Alarm Pintu Terbuka Terlalu Lama: Bunyi beep intermiten & LED Kuning berkedip cepat
            if (millis() - lastToneToggle >= 500) {
                lastToneToggle = millis();
                toneToggleState = !toneToggleState;
                buzzer_set(toneToggleState);
                digitalWrite(PIN_LED_YELLOW, toneToggleState ? HIGH : LOW);
            }

            // Segera setelah pintu ditutup kembali rapat:
            if (isClosed) {
                Serial.println("[DOOR] ✅ Pintu telah ditutup rapat. Mematikan peringatan Door Ajar.");
                buzzer_set(false);
                digitalWrite(PIN_LED_YELLOW, LOW);
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                buzzer_beep(100);
            }
            break;

        case DoorState::DOOR_FORCED:
            // CONDITION 5: Sirine Darurat Pembobolan (Strobe LED Merah + Sirine 2-Tone Kencang)
            if (millis() - lastToneToggle >= 180) {
                lastToneToggle = millis();
                toneToggleState = !toneToggleState;
                buzzer_set(toneToggleState);
                digitalWrite(PIN_LED_RED, toneToggleState ? HIGH : LOW);
            }

            // Alarm pembobolan berhenti jika pintu ditutup kembali atau di-reset kartu sah
            if (isClosed) {
                Serial.println("[SECURITY ALARM] 🔕 Pintu tertutup kembali. Sirine pembobolan dimatikan.");
                buzzer_set(false);
                digitalWrite(PIN_LED_RED, LOW);
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
            }
            break;
    }

    lastReedRawClosed = isClosed;
}
