# Deployment

## Local development

- Backend: `php artisan serve` against SQLite or a local MySQL instance.
- Frontend: `npm run dev` (Vite dev server), pointed at the local backend API base URL.
- Firmware: flashed over USB, Wi-Fi pointed at a local network reachable by both the ESP32 and the
  machine running the backend.

## Moving beyond local development

- Switch the API to HTTPS (Section 12) — self-signed cert is acceptable for a school
  demonstration on a local network if paired with a clear explanation in the project report;
  otherwise use a real cert if the backend is reachable beyond the LAN.
- Set real environment variables/secrets on the deployment target — never commit them
  (`SECURITY.md`).
- Confirm the ESP32's `API base URL` config is updated for the deployment target.
- Re-run the full `TESTING.md` checklist against the deployed environment, not just localhost —
  network conditions (latency, intermittent connectivity) are exactly what the offline-first
  design needs to be validated against.

## Demo-day checklist

- [ ] Backend reachable from the venue's network
- [ ] ESP32 Wi-Fi credentials match the venue's network
- [ ] Dashboard reachable on a laptop/projector
- [ ] At least one registered test card and one deliberately-unregistered card on hand
- [ ] A way to physically disconnect/interfere with Wi-Fi to demonstrate offline behavior live
