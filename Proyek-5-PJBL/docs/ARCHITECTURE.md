# System Architecture

## Overview

Three components, one source of truth (the Laravel backend / database):

```text
        ┌─────────────┐        HTTPS (Bearer DEVICE_TOKEN)        ┌──────────────────┐
 Card →  │  ESP32 +    │ ───────────────────────────────────────► │  Laravel REST API │
         │  RC522      │ ◄─────────────────────────────────────── │  + MySQL/SQLite   │
         │  (edge node)│              JSON responses               └──────────────────┘
         └─────────────┘                                                    ▲
               │ local queue                                                │ REST (read/write)
               │ (offline-first)                                            │
               ▼                                                            │
     LittleFS/SPIFFS pending events                                ┌──────────────────┐
                                                                     │  React Dashboard │
                                                                     │  (TS + Tailwind) │
                                                                     └──────────────────┘
```

## Component responsibilities

See `PROJECT_BRIEF.md` Section 2 for the authoritative list. Summary:

- **ESP32** is the only component allowed to make real-time hardware decisions (unlock/lock,
  accept/reject a card). It must be able to do this correctly even with no network connection.
- **Laravel** is the single source of truth for attendance history, student/card/device records,
  and is the only component that resolves duplicate/idempotent event submissions.
- **React dashboard** is a read-mostly operational view. It does not talk to the ESP32 directly —
  only to the Laravel API.

## Data flow

1. Card tap → ESP32 validates locally against its cached card table → creates event.
2. Event persisted to local storage **before** any network attempt (offline-first, Section 6).
3. If online: event POSTed immediately to `/api/attendance`; removed locally only on confirmed
   success (including the `duplicate: true` response).
4. If offline: event stays queued; `SyncManager` drains the queue on next Wi-Fi reconnect.
5. Dashboard polls the Laravel API for attendance, device, and status data.

## Why offline-first drives the architecture

Section 6 and 7 of the brief are the two requirements with the most design impact:

- The ESP32 must never treat "network unavailable" as "cannot record attendance."
- The backend must never treat "received this event twice" as "create it twice."

Every other architectural decision (state machine instead of delays, unique `event_id` generated
once at the edge, DB-level unique constraint) exists to make these two guarantees actually hold
under real-world failure conditions (dropped Wi-Fi, retried HTTP requests, power loss).

## Related docs

- `FIRMWARE.md` — ESP32-side design detail
- `API.md` — request/response contract
- `DATABASE.md` — schema detail
- `SECURITY.md` — auth model
