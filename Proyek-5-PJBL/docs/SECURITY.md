# Security

Per `PROJECT_BRIEF.md` Section 13.

## Device / API authentication

- Each ESP32 device is issued its own `DEVICE_TOKEN`, sent as `Authorization: Bearer <token>`.
- The RFID card UID is **never** used as an API credential (Section 12) — it identifies a card,
  not a device, and card UIDs are not secret.
- Backend validates the token, identifies the device, and verifies it's authorized before
  processing any request.

## Secrets handling

- No secrets, API keys, or device tokens committed to GitHub.
- Backend secrets via `.env` (excluded by `.gitignore`); `.env.example` documents required keys
  without real values.
- Firmware device token/Wi-Fi credentials kept out of version control — use a local
  `secrets.h`/`config.h` (gitignored) with a committed `secrets.h.example` template, or a
  build-time injected value.

## Transport security

- HTTPS required once the system moves beyond local development (Section 12).
- Document the local-dev exception (plain HTTP on a trusted LAN) here if used during development,
  and the plan to move to HTTPS before any wider deployment.

## Application-level protections

- Input validation on every API endpoint (Form Requests in Laravel).
- Card activation/deactivation supported and enforced at validation time.
- Unique `event_id` enforced at the database level (see `DATABASE.md`), not only in application
  logic.
- Access logging for attendance events and card-management actions.

## Out of scope for this project

Per Section 19, real-world physical-access safety requirements (emergency/manual release,
power-failure behavior, backup power, fire/exit compliance) are explicitly out of scope for this
school prototype. Do not represent this system as suitable for controlling a real building exit.
