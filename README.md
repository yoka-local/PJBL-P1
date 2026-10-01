# NexusGate: Advanced IoT Attendance & Door Access System

**Sistem Absensi dan Kontrol Akses Pintu Inovatif Berbasis ESP32**

An enterprise-grade IoT attendance and door-access system built with an ESP32 + RC522 RFID reader, a Laravel REST API backend, and a React dashboard. Built as a school PJBL project, structured as a highly scalable, real-world modular system integrating modern IoT innovations.

## What it does

- Students tap an RFID/NFC card at the door.
- The ESP32 validates the card, unlocks the door, and records an attendance event.
- A reed switch tracks door open/closed state and re-locks automatically.
- The device works **offline-first**: attendance is never lost due to Wi-Fi/server outages, and
  queued events sync automatically (without duplication) once connectivity returns.
- A Laravel backend is the source of truth; a React dashboard gives staff visibility into
  attendance, cards, students, and device status.

### 🚀 Key Innovations & Features

- **Real-Time Telegram Notifications**: Instant alerts sent to administrators or parents upon student arrival, or when security anomalies occur.
- **Smart Wi-Fi Captive Portal**: No hardcoded credentials. Connect to the ESP32's self-hosted setup page to dynamically configure Wi-Fi networks.
- **Anti-Passback & Cooldown**: Smart backend logic prevents "Titip Absen" (buddy punching) by enforcing a 5-minute cooldown per card.
- **Role-Based & Time-Based Access**: Granular access control where student cards only work during school hours, while admin cards have 24/7 access.
- **Door Ajar Alarm**: Hardware monitoring triggers local alarms and backend alerts if the door is held open beyond the configured timeout.
- **Over-The-Air (OTA) Updates**: Seamless wireless firmware updates managed remotely, minimizing physical maintenance.

Full requirements: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md).
Build plan: [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
MVP scope: [`docs/MVP.md`](./docs/MVP.md).

## Repository structure

```text
Proyek-5-PJBL/
├── README.md
├── PROJECT_BRIEF.md
│
├── docs/
│   ├── IMPLEMENTATION_PLAN.md   ← start here
│   ├── MVP.md
│   ├── ARCHITECTURE.md
│   ├── HARDWARE.md
│   ├── FIRMWARE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── TESTING.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── firmware/esp32/     ← ESP32 firmware (C/C++, Arduino/ESP-IDF)
├── backend/laravel/    ← Laravel REST API
├── frontend/react/     ← React + TypeScript dashboard
└── hardware/
    ├── wiring/
    └── diagrams/
```

## Status

Project scaffolded, not yet implemented. Follow the phases in
[`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) in order: ESP32 bring-up → RFID →
attendance model → door state machine → offline sync → backend → dashboard → integration.

## Development principle

Reliability > Security > Correctness > Maintainability > UI polish. Build the MVP
([`docs/MVP.md`](./docs/MVP.md)) first, verify each piece independently, then integrate.
