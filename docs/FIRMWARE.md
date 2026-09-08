# Firmware (ESP32)

## Stack

C/C++ on Arduino framework (or ESP-IDF), RC522 library, Wi-Fi + HTTP(S) client, persistent local
storage (LittleFS/SPIFFS, optionally SD card).

## Module breakdown

Mirrors the phase breakdown in `IMPLEMENTATION_PLAN.md`:

- `Config` — pin assignments and tunable constants (door timeouts, retry backoff, Wi-Fi
  credentials placeholder, API base URL, device token). No magic numbers scattered through the
  rest of the code.
- `WifiManager` — connect/reconnect with backoff; exposes connection state to the rest of the
  firmware without blocking.
- `RfidReader` — wraps the RC522 library; returns a normalized UID string; debounces repeated
  reads of a held card.
- `CardStore` — local cache of `{card_uid, student_id, active}` used for offline authorization;
  refreshed from the backend when online.
- `DoorController` — explicit state machine per `PROJECT_BRIEF.md` Section 4:
  `LOCKED → UNLOCKED_WAITING → DOOR_OPEN → LOCKED`, non-blocking, timeout constants from `Config`.
- `EventQueue` — persistent pending-event storage; write-before-network-attempt; delete only on
  confirmed server success.
- `SyncManager` — drains `EventQueue` against the Laravel API on Wi-Fi connect/reconnect; retry
  with backoff on failure.
- `Feedback` — LED/buzzer signaling tied to state transitions and access results.

## Timestamp handling

Time source is NTP once Wi-Fi is available. Document the offline fallback approach here once
decided (e.g. millis()-since-boot + last-known NTP offset, corrected retroactively on next sync).
This affects the `timestamp` field of events created while offline — decide and record the
approach so backend ingestion can account for it if needed.

## event_id generation

Generated **once** at event creation time and persisted with the event — never regenerated on
retry. See `IMPLEMENTATION_PLAN.md` Phase 3 and `PROJECT_BRIEF.md` Section 5/7 for why this
matters for idempotent sync.

## Known limitations / open decisions

- Local queue capacity policy if storage fills up (should not silently drop events).
- Behavior if the RC522 or reed switch itself fails/disconnects mid-operation.
