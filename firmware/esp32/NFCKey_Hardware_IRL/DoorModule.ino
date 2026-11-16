/**
 * ============================================================================
 * MODUL: DoorModule.ino
 * Kontrol Relay Solenoid, Reed Switch Pintu, LED & Audio Feedback
 * ============================================================================
 */

#include "Config.h"

static DoorState currentDoorState = DoorState::LOCKED;
static unsigned long stateEntryTime = 0;
static bool lastReedRawClosed = true;

// Definisi variabel timing dinamis (nilai awal dari Config.h, diupdate live dari Supabase)
unsigned long unlockHoldTimeMs    = DEFAULT_UNLOCK_HOLD_TIME_MS;
unsigned long timeoutDoorOpenMs   = DEFAULT_TIMEOUT_DOOR_OPEN_MS;
unsigned long debounceDelayMs     = DEFAULT_DEBOUNCE_DELAY_MS;
unsigned long syncRetryIntervalMs = DEFAULT_SYNC_RETRY_INTERVAL_MS;

// Timing non-blocking untuk buzzer & strobe LED
static unsigned long lastToneToggle = 0;
static bool toneToggleState = false;

// Hardware Low-Level Abstractions
static void lockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_OFF);
    digitalWrite(PIN_LED_GREEN, LOW);
}

static void unlockRelayHardware() {
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    pinMode(PIN_DOOR_RELAY, OUTPUT);
    digitalWrite(PIN_DOOR_RELAY, RELAY_TRIGGER_ON);
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, LOW);
}

DoorState door_get_state() {
    return currentDoorState;
}

// ============================================================================
// PEMBACAAN SENSOR MAGNETIK REED SWITCH (MC-38 DENGAN FILTER DEBOUNCE 60MS)
// ============================================================================
static bool debouncedDoorOpen = false;
static int lastRawReedReading = HIGH;
static unsigned long lastReedDebounceTime = 0;
const unsigned long REED_DEBOUNCE_DELAY_MS = 60;

bool door_is_open_physically() {
    if (!USE_DOOR_MAGNET_SENSOR) return false;

    int rawReading = digitalRead(PIN_REED_SWITCH);

    if (rawReading != lastRawReedReading) {
        lastReedDebounceTime = millis();
        lastRawReedReading = rawReading;
    }

    if ((millis() - lastReedDebounceTime) >= REED_DEBOUNCE_DELAY_MS) {
        bool currentOpen = (rawReading == HIGH);
        if (currentOpen != debouncedDoorOpen) {
            debouncedDoorOpen = currentOpen;
            Serial.printf("[REED] 🧲 Status Sensor Pintu: %s (GPIO 27 = %s)\n",
                          debouncedDoorOpen ? "TERBUKA (Magnet Menjauh)" : "TERTUTUP (Magnet Menempel)",
                          debouncedDoorOpen ? "HIGH (3.3V)" : "LOW (GND)");
        }
    }

    return debouncedDoorOpen;
}

// ============================================================================
// KONTROL LED & BUZZER
// ============================================================================
void led_yellow_set(bool state) {
    if (currentDoorState != DoorState::DOOR_AJAR) {
        digitalWrite(PIN_LED_YELLOW, state ? HIGH : LOW);
    }
}

void led_yellow_blink() {
    static unsigned long lastBlink = 0;
    static bool blinkState = false;
    if (currentDoorState == DoorState::DOOR_AJAR) return;

    if (millis() - lastBlink >= 300) {
        lastBlink = millis();
        blinkState = !blinkState;
        digitalWrite(PIN_LED_YELLOW, blinkState ? HIGH : LOW);
    }
}

void buzzer_mute() {
    ledcDetachPin(PIN_BUZZER);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, BUZZER_TRIGGER_OFF);
}

void buzzer_tone_soft(unsigned int freq) {
    if (freq == 0) {
        buzzer_mute();
        return;
    }
    ledcSetup(BUZZER_PWM_CHANNEL, freq, BUZZER_PWM_RESOLUTION);
    ledcAttachPin(PIN_BUZZER, BUZZER_PWM_CHANNEL);
    uint32_t duty = BUZZER_ACTIVE_LOW ? BUZZER_DUTY_SOFT : (255 - BUZZER_DUTY_SOFT);
    ledcWrite(BUZZER_PWM_CHANNEL, duty);
}

void buzzer_set(bool state) {
    buzzer_mute();
    digitalWrite(PIN_BUZZER, state ? BUZZER_TRIGGER_ON : BUZZER_TRIGGER_OFF);
}

void buzzer_beep(unsigned int duration_ms) {
    buzzer_set(true);
    delay(duration_ms);
    buzzer_set(false);
}

// ============================================================================
// MELODI KASANE TETO - MACHINE LOVE / AIRPLANE CHIME (teto.mp4)
// Peringatan Pintu Terbuka Terlalu Lama (DOOR AJAR)
// Mainkan lagu Teto 1x, kemudian beralih ke alarm intermiten normal sampai pintu ditutup.
// ============================================================================
struct MelodyNote {
    uint16_t freq;     // Frekuensi dalam Hz (0 = jeda / silent)
    uint16_t duration; // Durasi nada dalam milidetik (ms)
};

static const MelodyNote tetoMelody[] = {
    // 1. Chime Sabuk Pengaman Pesawat ("DING - DONG")
    { 587, 500 },  // D5: DING---
    { 0,   120 },  // Jeda
    { 466, 650 },  // A#4 / Bb4: DONG---
    { 0,   800 },  // Jeda sebelum vokal Teto masuk

    // 2. Vokal Kasane Teto: "As long as there are stars up above..."
    { 698,  320 }, // F5: As
    { 784,  320 }, // G5: long
    { 932,  320 }, // A#5: as
    { 932,  280 }, // A#5: there
    { 1046, 320 }, // C6: are
    { 1175, 320 }, // D6: stars
    { 1568, 170 }, // G6: up
    { 1397, 170 }, // F6: a-
    { 1175, 300 }, // D6: -bove
    { 0,    120 }, // Jeda nafas

    // 3. Vokal Kasane Teto: "...I will always be in love!"
    { 1046, 170 }, // C6: I
    { 932,  170 }, // A#5: will
    { 1046, 250 }, // C6: al-
    { 1175, 320 }, // D6: -ways
    { 1046, 320 }, // C6: be
    { 932,  320 }, // A#5: in
    { 932,  650 }, // A#5: love!
    { 0,   1200 }  // Jeda sebelum beralih ke alarm intermiten
};

static const size_t TETO_MELODY_COUNT = sizeof(tetoMelody) / sizeof(tetoMelody[0]);
static size_t tetoMelodyIdx = 0;
static unsigned long tetoNoteStartTime = 0;
static bool tetoNoteIsPlaying = false;
static bool tetoFinishedOnce = false;
static unsigned long normalAjarLastToggle = 0;
static bool normalAjarToneState = false;

static void stopTetoMelody() {
    buzzer_mute();
    digitalWrite(PIN_LED_YELLOW, LOW);
    tetoMelodyIdx = 0;
    tetoNoteIsPlaying = false;
    tetoFinishedOnce = false;
    normalAjarToneState = false;
}

static void playTetoTick() {
    unsigned long now = millis();

    // 1. JIKA LAGU TETO SUDAH SELESAI DIPUTAR 1x:
    // Beralih ke alarm peringatan pintu biasa yang lembut (Intermittent Beep)
    // Beep lembut 120ms ... Jeda 1200ms secara berulang sampai pintu ditutup rapat
    if (tetoFinishedOnce) {
        if (!normalAjarToneState) {
            // Periode diam (1200ms jeda)
            if (now - normalAjarLastToggle >= 1200) {
                normalAjarLastToggle = now;
                normalAjarToneState = true;
                buzzer_tone_soft(880); // Nada A5 lembut
                digitalWrite(PIN_LED_YELLOW, HIGH);
            }
        } else {
            // Periode bunyi beep (120ms)
            if (now - normalAjarLastToggle >= 120) {
                normalAjarLastToggle = now;
                normalAjarToneState = false;
                buzzer_mute();
                digitalWrite(PIN_LED_YELLOW, LOW);
            }
        }
        return;
    }

    // 2. MEMUTAR MELODI KASANE TETO PERTAMA KALI (SEKALI SAJA):
    uint16_t currentDuration = tetoMelody[tetoMelodyIdx].duration;

    if (!tetoNoteIsPlaying) {
        uint16_t freq = tetoMelody[tetoMelodyIdx].freq;
        if (freq > 0) {
            buzzer_tone_soft(freq); // Output PWM lembut tidak memekakkan telinga
            digitalWrite(PIN_LED_YELLOW, HIGH);
        } else {
            buzzer_mute();
            digitalWrite(PIN_LED_YELLOW, LOW);
        }
        tetoNoteStartTime = now;
        tetoNoteIsPlaying = true;
    } else {
        // Artikulasi staccato 25ms sebelum nada selesai agar ketukan vokal renyah
        if (currentDuration > 80 && (now - tetoNoteStartTime >= currentDuration - 25)) {
            buzzer_mute();
        }

        if (now - tetoNoteStartTime >= currentDuration) {
            buzzer_mute();
            digitalWrite(PIN_LED_YELLOW, LOW);

            tetoNoteIsPlaying = false;
            tetoMelodyIdx++;
            if (tetoMelodyIdx >= TETO_MELODY_COUNT) {
                // Selesai memutar lagu Teto (1x)! Beralih ke loop alarm intermiten biasa
                tetoFinishedOnce = true;
                normalAjarLastToggle = now;
                normalAjarToneState = false;
                Serial.println("[DOOR] 🎵 Kasane Teto selesai (1x). Beralih ke alarm intermiten biasa...");
            }
        }
    }
}

// ============================================================================
// INISIALISASI PERANGKAT KERAS (CONDITION 2: SAFE BOOT)
// ============================================================================
void door_init() {
    // 1. Kunci solenoid dan matikan LED status sejak awal booting
    lockRelayHardware();

    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_LED_YELLOW, OUTPUT);

    // 2. Inisialisasi Buzzer (pastikan pin langsung diset ke level OFF / Senyap)
    digitalWrite(PIN_BUZZER, BUZZER_TRIGGER_OFF);
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, BUZZER_TRIGGER_OFF);
    buzzer_set(false);

    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_LED_YELLOW, LOW);

    Serial.printf("[DOOR] Inisialisasi: Standby Relay Pin %d = %s, Standby Buzzer Pin %d = %s\n",
                  PIN_DOOR_RELAY, RELAY_TRIGGER_OFF == HIGH ? "HIGH (3.3V)" : "LOW (0V)",
                  PIN_BUZZER, BUZZER_TRIGGER_OFF == HIGH ? "HIGH (3.3V)" : "LOW (0V)");

    if (USE_DOOR_MAGNET_SENSOR) {
        pinMode(PIN_REED_SWITCH, INPUT_PULLUP);
        delay(50);
        int initialReading = digitalRead(PIN_REED_SWITCH);
        lastRawReedReading = initialReading;
        debouncedDoorOpen = (initialReading == HIGH);
        lastReedDebounceTime = millis();
        lastReedRawClosed = !debouncedDoorOpen;
        Serial.printf("[DOOR] Inisialisasi Reed Switch selesai. Status fisik: %s\n",
                      lastReedRawClosed ? "TERTUTUP (CLOSED)" : "TERBUKA (OPEN)");
    } else {
        Serial.println("[DOOR] Mode Meja Kerja (Bench Test): Sensor magnet dinonaktifkan.");
        Serial.println("[DOOR] Timer auto-relock 5 detik aktif (Bebas dari alarm pembobolan palsu).");
    }

    currentDoorState = DoorState::LOCKED;
    stateEntryTime = millis();
}

// ============================================================================
// AKSI BUKA PINTU (CONDITION 1: AKSES DITERIMA)
// ============================================================================
void door_unlock() {
    if (currentDoorState == DoorState::DOOR_FORCED || currentDoorState == DoorState::DOOR_AJAR) {
        door_alarm_reset();
    }

    if (currentDoorState == DoorState::LOCKED) {
        Serial.println("\n[DOOR] ==============================================");
        Serial.println("[DOOR]  AKSI: Akses Diterima! Solenoid TERBUKA (5 Detik)");
        Serial.println("[DOOR] ==============================================");

        unlockRelayHardware();
        currentDoorState = DoorState::UNLOCKED_WAITING;
        stateEntryTime = millis();

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
    stopTetoMelody();
    buzzer_set(false);
    toneToggleState = false;
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
            if (timeInState >= unlockHoldTimeMs) {
                Serial.printf("[DOOR] 🔒 Waktu habis (%lu ms). Solenoid MENGUNCI KEMBALI.\n", unlockHoldTimeMs);
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

            if (lastReedRawClosed && isPhysicallyOpen) {
                Serial.println("\n[SECURITY ALARM] 🚨 PERINGATAN: PINTU DIBOBOL PAKSA (DOOR FORCED OPEN)!");
                currentDoorState = DoorState::DOOR_FORCED;
                stateEntryTime = millis();
                lastToneToggle = millis();
            }
            break;

        case DoorState::UNLOCKED_WAITING:
            if (isPhysicallyOpen) {
                Serial.println("[DOOR] 🚪 Pintu fisik didorong terbuka (DOOR_OPEN).");
                currentDoorState = DoorState::DOOR_OPEN;
                stateEntryTime = millis();
            } else if (timeInState >= DEFAULT_TIMEOUT_UNLOCKED_WAITING_MS) {
                Serial.println("[DOOR] 🔒 Pintu tidak pernah dibuka. Auto-relock diaktifkan kembali.");
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                nfc_reset_scanner();
                buzzer_beep(100);
            }
            break;

        case DoorState::DOOR_OPEN:
            if (isClosed) {
                Serial.println("[DOOR] 🔒 Pintu ditutup kembali. Solenoid MENGUNCI KEMBALI.");
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                nfc_reset_scanner();
                buzzer_beep(100);
            } else if (timeInState >= timeoutDoorOpenMs) {
                Serial.printf("\n[DOOR] 🎵 PERINGATAN: Pintu terbuka >%lu detik! Memutar Kasane Teto (Machine Love)...\n", timeoutDoorOpenMs / 1000);
                currentDoorState = DoorState::DOOR_AJAR;
                stateEntryTime = millis();
                tetoFinishedOnce = false;
                normalAjarToneState = false;
                tetoMelodyIdx = 0;
                tetoNoteIsPlaying = false;
                tetoNoteStartTime = millis();
            }
            break;

        case DoorState::DOOR_AJAR:
            // Memutar melodi Kasane Teto 1x, lalu alarm intermiten biasa secara non-blocking
            playTetoTick();

            if (isClosed) {
                Serial.println("[DOOR] ✅ Pintu telah ditutup rapat. Mematikan alarm Door Ajar.");
                stopTetoMelody();
                buzzer_set(false);
                toneToggleState = false;
                digitalWrite(PIN_LED_YELLOW, LOW);
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
                buzzer_beep(100);
            }
            break;

        case DoorState::DOOR_FORCED:
            if (millis() - lastToneToggle >= 180) {
                lastToneToggle = millis();
                toneToggleState = !toneToggleState;
                buzzer_set(toneToggleState);
                digitalWrite(PIN_LED_RED, toneToggleState ? HIGH : LOW);
            }

            if (isClosed && (timeInState >= 800)) {
                Serial.println("[SECURITY ALARM] 🔕 Pintu tertutup kembali. Sirine pembobolan dimatikan.");
                buzzer_set(false);
                toneToggleState = false;
                digitalWrite(PIN_LED_RED, LOW);
                lockRelayHardware();
                currentDoorState = DoorState::LOCKED;
                stateEntryTime = millis();
            }
            break;
    }

    lastReedRawClosed = isClosed;
}
