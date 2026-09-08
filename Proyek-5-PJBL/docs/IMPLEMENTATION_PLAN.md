# Implementation Plan — Smart NFC Attendance & Door Access System

This plan expands Section 16 (`Development Strategy`) of `PROJECT_BRIEF.md` into concrete,
buildable tasks. Each phase lists its goal, deliverables, the specific tasks to do, and the
tests (from Section 18) that must pass before moving on. Phases are ordered by dependency, not
strictly by calendar time — Phase 6 (Backend) can start as soon as the API contract in
`docs/API.md` is frozen, in parallel with Phase 4/5 firmware work, if more than one person is on
the team.

**Golden rule from the brief:** Reliability > Security > Correctness > Maintainability > UI polish.
Do not let dashboard polish or extra features (Section 17's "do NOT add") creep in before the
MVP checklist (Section 17) and Definition of Done (Section 20) are both green.

---

## Phase 0 — Repository & Environment Setup (half a day)

**Goal:** A clean, buildable skeleton everyone on the team can clone and run.

- [ ] Confirm repo structure matches Section 15 (already scaffolded — see below).
- [ ] Initialize `firmware/esp32` as a PlatformIO project (preferred over raw Arduino IDE for
      dependency management, unit tests, and CI later) OR document the Arduino IDE board/library
      setup in `docs/FIRMWARE.md` if PlatformIO isn't available.
- [ ] Initialize `backend/laravel` with `composer create-project laravel/laravel .` and confirm
      it boots locally (`php artisan serve`).
- [ ] Initialize `frontend/react` with Vite + React + TypeScript + Tailwind.
- [ ] Add root `.gitignore` covering `node_modules/`, `vendor/`, `.env`, PlatformIO `.pio/`,
      build artifacts, and IDE folders (already added — see below).
- [ ] Add `.env.example` files (backend and firmware config header) — never commit real secrets
      (Section 13).
- [ ] Agree on the API contract shape (Section 11/5) as a living doc in `docs/API.md` *before*
      firmware and backend diverge — this is the seam between the two halves of the team.

**Exit check:** `php artisan serve`, `npm run dev`, and an empty ESP32 sketch all build/run with
no errors.

---

## Phase 1 — ESP32 Bring-Up

**Goal:** Bare ESP32 connects to Wi-Fi and logs to serial. No sensors yet.

Tasks:
- [ ] Board bring-up, correct board profile in `platformio.ini` (or Arduino IDE board manager).
- [ ] Serial logging convention (e.g. `[WIFI]`, `[RFID]`, `[DOOR]`, `[SYNC]` prefixes) — decide
      this now, it pays off during Phase 5/8 debugging.
- [ ] Wi-Fi connect/reconnect logic with backoff (don't block forever if Wi-Fi is down — this is
      a preview of the offline-first requirement in Section 6).
- [ ] `config.h`/`Config` module holding all pin assignments and tunable constants (this is where
      the 10s/30s timeouts from Section 4 will live later — Section 4 explicitly asks for
      configurable constants, not hard-coded delays).

**Tests (Section 18 — Network):** Wi-Fi available; Wi-Fi disconnected mid-run; Wi-Fi restored.

---

## Phase 2 — RFID (RC522)

**Goal:** Reliable UID reads, mapped against a local "known cards" table.

Tasks:
- [ ] Wire RC522 over SPI per `docs/HARDWARE.md` pinout.
- [ ] `RfidReader` module: initialize, poll/interrupt for new card, return normalized UID string
      (consistent casing/format, e.g. `04:A3:92:7F` as in the brief's example event).
- [ ] Debounce repeated reads of the same card held near the reader (avoid firing 10 events for
      one tap).
- [ ] Local card table stub — for now, a hardcoded or SPIFFS/LittleFS-loaded list of
      `{card_uid, student_id, active}`; this becomes the offline authorization cache once Phase 5
      lands. Loading this table is a full sub-task in itself (sync down from backend on boot /
      Wi-Fi reconnect).
- [ ] Card validation logic: registered+active → accept; unregistered or inactive → reject.

**Tests (Section 18 — Authentication):** registered card, unregistered card, disabled card.

---

## Phase 3 — Attendance Event Model

**Goal:** A valid card tap produces a well-formed, uniquely-identified event object in memory.

Tasks:
- [ ] `AttendanceEvent` struct/class matching the JSON shape in Section 5 exactly
      (`event_id`, `student_id`, `card_uid`, `timestamp`, `device_id`, `status`).
- [ ] `event_id` generation: must be unique per event and stable across retries of the *same*
      event (i.e., generated once at creation time, not regenerated on each sync retry — this is
      what makes the idempotency key in Section 7 work). A UUID or hash of
      `(device_id, card_uid, timestamp, monotonic counter)` works well on ESP32.
- [ ] Timestamp source: RTC via NTP once Wi-Fi is up; document fallback behavior for offline taps
      (e.g., millis()-since-boot + last-known-NTP-offset, corrected on next sync) in
      `docs/FIRMWARE.md` — this is a real design decision, not a footnote.
- [ ] `device_id` fixed per-device constant, set in `config.h`.

**Exit check:** A test card tap prints a well-formed JSON event to serial matching the brief's
example exactly.

---

## Phase 4 — Door Control & State Machine

**Goal:** Implement the explicit state machine from Section 4, not scattered `delay()` calls.

States: `LOCKED → UNLOCKED_WAITING → DOOR_OPEN → LOCKED`, with the two timeout branches.

Tasks:
- [ ] `DoorController` module implemented as an explicit `enum class DoorState` +
      `switch`/state-table update function called every loop tick (non-blocking — Section 4's
      whole point is avoiding blocking delays that would freeze RFID polling and networking).
- [ ] Lock driver output goes through the ESP32 GPIO → MOSFET/relay driver → lock, never GPIO
      directly to the lock (Section 8's hardware rule) — flag this in `docs/HARDWARE.md` with a
      wiring diagram.
- [ ] Reed switch input with debounce.
- [ ] `UNLOCKED_WAITING` timeout constant (~10s, configurable) → auto-relock if the door never
      opens.
- [ ] `DOOR_OPEN` timeout constant (~30s, configurable) → warning buzzer while continuing to
      monitor the reed switch, relock immediately when it closes.
- [ ] LED/buzzer feedback wired to state transitions (green = access granted, red = rejected,
      yellow = door-open warning, buzzer = reject + door-open-too-long).

**Tests (Section 18 — Door):** opens after valid card; closes normally; never opens (timeout);
remains open too long (warning); reed switch failure (e.g., stuck open — should not hang the
state machine forever, should keep buzzing and keep polling).

---

## Phase 5 — Offline-First Storage & Sync

**Goal:** No attendance event is ever lost because Wi-Fi or the server was down. This is the
highest-risk phase — budget the most review time here.

Tasks:
- [ ] Persistent local queue (LittleFS/SPIFFS on internal flash, or SD card if using the optional
      hardware) storing pending `AttendanceEvent`s as JSON lines or small files keyed by
      `event_id`.
- [ ] Write path: card validated → event created → **written to persistent storage before**
      attempting any network call (never hold an event only in RAM, since a brownout or reset
      would lose it).
- [ ] `SyncManager` module: on Wi-Fi connect (both at boot and on reconnect), iterate pending
      events, POST each to `/api/attendance` with `Authorization: Bearer DEVICE_TOKEN`.
- [ ] Delete-only-on-confirmation rule (Section 6): remove the local record **only** after
      receiving a success response (`success: true`) from the server, including the
      `duplicate: true` case, which still counts as success per Section 11's example response.
- [ ] Retry/backoff for failed sync attempts (network error, 5xx, timeout) — keep the local copy,
      retry later, do not spin-retry tightly (respect device and server resources).
- [ ] Cap and monitor local storage usage; decide and document a policy for what happens if the
      queue fills up (unlikely for a school demo, but note it in `docs/FIRMWARE.md` as a known
      limitation rather than silently dropping events).

**Tests (Section 18 — Network & Synchronization):** Wi-Fi disconnected during a tap; Wi-Fi
restored with multiple pending events queued; successful upload; failed upload + retry;
duplicate event submission (retry after a success the ESP32 didn't hear back about); server
already contains the event.

---

## Phase 6 — Laravel Backend

**Goal:** Source of truth for students, cards, devices, and attendance, with idempotent event
ingestion.

Tasks:
- [ ] Migrations for `students`, `cards`, `attendance`, `devices` exactly per Section 10, with a
      **unique constraint on `attendance.event_id`** — this is not optional, it's what makes
      Section 7's duplicate protection actually enforceable at the database level instead of only
      in application code.
- [ ] Eloquent models + relationships (`Student hasMany Card`, `Student hasMany Attendance`, etc.)
- [ ] Device/API authentication: Laravel Sanctum personal access tokens (or a simple custom
      bearer-token middleware) issuing one `DEVICE_TOKEN` per device row — see Section 12,
      explicitly *not* the card UID.
- [ ] `POST /api/attendance` — validate payload shape, look up `event_id`:
  - not found → create attendance row, return `{success: true, event_id, message}`.
  - found → return `{success: true, event_id, duplicate: true, message}` **without** inserting
    (Section 7's exact flow) — wrap the "check then insert" in a DB transaction or rely on the
    unique constraint + catch-the-duplicate-key-exception pattern to avoid a race condition
    between concurrent retries.
- [ ] `GET /api/students`, `GET /api/cards`, `POST /api/cards` (register/activate/deactivate a
      card), `GET /api/devices`, `POST /api/devices/heartbeat` (updates `last_seen` + `status`).
- [ ] Input validation (Form Requests) on every endpoint — malformed request handling is an
      explicit test case in Section 18.
- [ ] Structured JSON responses + correct HTTP status codes (200/201/401/403/404/422) per
      Section 11.
- [ ] Access logging for attendance and card-management actions (Section 13).

**Tests (Section 18 — Synchronization & Security):** successful create, duplicate event_id
(same and differing payload), invalid/missing bearer token, unauthorized/unknown device,
malformed JSON body, disabled card attempting registration flows.

---

## Phase 7 — React Dashboard

**Goal:** Read-mostly operational view over the backend's data — not a second source of truth.

Tasks:
- [ ] Project setup (Vite + TS + Tailwind), typed API client (`fetch`/`axios` wrapper) matching
      `docs/API.md`.
- [ ] **Overview** page: today's attendance count, recent events, device online/offline, current
      door state, pending-sync count (Section 14).
- [ ] **Students** page: list + student_id/name/class + linked card.
- [ ] **Cards** page: UID, assigned student, active/inactive toggle, registration form.
- [ ] **Attendance** page: filterable table (date/time, student, card, device, status).
- [ ] **Devices** page: device_id, online/offline (derived from `last_seen` vs. a staleness
      threshold), last heartbeat, door status if the device reports it, pending-sync count if
      exposed by the device/backend.
- [ ] Polling (simple `setInterval` refetch is fine for a school project) rather than WebSockets
      — keep it boring and reliable per the development principle in Section 21.
- [ ] Keep the UI intentionally minimal (Section 14: "clean and professional rather than
      overloaded") — resist adding features beyond this list until the MVP is done end-to-end.

**Exit check:** Dashboard reflects a real attendance event within one poll interval of a card tap
going through the full ESP32 → Laravel path.

---

## Phase 8 — Integration & Full-System Testing

**Goal:** Everything in Section 18 passes together, on the real hardware, against the real
backend, with the real dashboard open.

Tasks:
- [ ] Run every scenario in Section 18 (Authentication, Door, Network, Synchronization,
      Security) as a checklist, not spot checks — write the checklist into `docs/TESTING.md` (see
      the scaffold already added) and tick items off with dates/notes.
- [ ] Deliberately kill Wi-Fi mid-session, queue several taps, restore Wi-Fi, confirm all events
      land exactly once in the database and dashboard.
- [ ] Deliberately hold the door open past 30s and confirm the buzzer/warning behavior without
      freezing card reads.
- [ ] Verify the Definition of Done list (Section 20) item by item.
- [ ] Only after all of the above: consider any of the optional/future items in Section 19
      (biometrics, emergency release, backup power) — explicitly out of scope for this MVP.

**Exit check:** Section 20's Definition of Done, all 15 items, checked off with evidence
(screenshots, logs, or short recorded demo) suitable for the PJBL presentation/report.

---

## Suggested Team Split (if more than one person)

| Track | Phases | Owns |
|---|---|---|
| Firmware | 1, 2, 3, 4, 5 | `firmware/esp32/`, `docs/FIRMWARE.md`, `docs/HARDWARE.md` |
| Backend | 6 | `backend/laravel/`, `docs/API.md`, `docs/DATABASE.md`, `docs/SECURITY.md` |
| Frontend | 7 | `frontend/react/` |
| Everyone | 0, 8 | Repo setup, `docs/API.md` contract, `docs/TESTING.md`, `docs/DEPLOYMENT.md` |

If solo, follow the phases roughly in order but freeze `docs/API.md` at the end of Phase 3/before
Phase 5, since both the firmware's sync payload and the backend's ingestion endpoint depend on it
being stable.

## Risks Worth Watching

- **Blocking code in the door state machine or RFID loop** (e.g. a stray `delay(30000)`) will
  make the whole device unresponsive — Section 4 exists specifically to prevent this; keep all
  waits as non-blocking timers checked on each loop tick.
- **Regenerating `event_id` on retry** breaks idempotency (Section 7) — generate once, persist it
  with the event, reuse it for every retry of that same event.
- **Deleting the local queue entry before confirming success** reintroduces the exact data-loss
  bug the offline-first requirement (Section 6) is designed to prevent.
- **Driving the lock directly from a GPIO pin** can damage the ESP32 or fail unsafely — always
  through a MOSFET/relay driver (Section 8).
- **Skipping the unique DB constraint** and relying only on "check then insert" application logic
  leaves a race-condition window during concurrent retries — use the constraint as the real
  guarantee, and treat the app-level check as an optimization/nicer error message on top of it.
