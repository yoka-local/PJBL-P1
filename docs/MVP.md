# MVP Scope

Source of truth: `PROJECT_BRIEF.md`, Section 17.

## In scope for MVP (100% COMPLETE)

- [x] **ESP32 firmware running**: Tested on physical ESP32 DevKit (30-pin & 32-pin) and Wokwi simulator.
- [x] **NFC / RC522 card reading**: Dual-support for Adafruit PN532 V3 (NFC priority) and MFRC522 (RFID fallback) with antenna gain +48dB.
- [x] **Registered card validation**: Instant local cache validation (<10ms) matching authorized cards.
- [x] **Invalid card rejection**: Red LED indicator + low-pitch warning buzzer + audit log recorded.
- [x] **Door unlocking**: Active LOW/HIGH 5V relay driving 12V solenoid door lock with safe cold-boot protection.
- [x] **Reed switch (open/closed detection)**: MC-38 magnetic sensor with internal pull-up debounce monitoring physical door state.
- [x] **Automatic locking after door closes**: Instant relock upon reed switch transition to closed.
- [x] **Door timeout**: 5s auto-relock if door is never opened + 30s door ajar warning alarm with yellow LED strobe.
- [x] **Wi-Fi connection with reconnect handling**: Non-blocking connection management with exponential retry interval.
- [x] **Attendance event creation**: Unique `event_id` generation (UUIDv4) preserved across all transmission attempts.
- [x] **REST API**: `/api/attendance/tap`, `/api/devices/heartbeat`, admin CRUD for users/cards/devices, worker summaries.
- [x] **Laravel backend**: Laravel 11/12/13 API with Sanctum bearer token authentication and role middleware.
- [x] **Database storage**: Fully normalized schema for users, cards, attendances, and devices with foreign keys.
- [x] **Offline event storage**: FIFO buffer queue persisting up to 30 events during internet/server outages.
- [x] **Automatic synchronization when connectivity returns**: Drain queue on Wi-Fi reconnect with confirmation delete.
- [x] **Duplicate event protection**: Database unique constraint on `event_id` + idempotent HTTP 200 response (`duplicate: true`).
- [x] **Complete dashboard**: React 19 + TypeScript dashboard with live stats, attendance stream, device liveness, cards CRUD, users CRUD, and settings.

## Explicitly out of scope for MVP

Real-world enterprise extensions deferred for post-PJBL production deployments:
- Face recognition
- Fingerprint authentication
- Native mobile application (responsive mobile web works out of the box)
- AI predictive features
- Multi-factor biometric authentication
- Physical emergency release key and backup UPS battery pack

## Status: 100% MVP DELIVERED

All 17 core MVP deliverables have been built, rigorously tested against the 6 physical operational conditions, and verified across both hardware and simulation environments.

