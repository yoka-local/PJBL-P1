# Hardware

## Bill of materials

Per `PROJECT_BRIEF.md` Section 8:

**Required**
- ESP32 dev board
- RC522 RFID/NFC reader
- RFID/NFC cards (student badges)
- Electronic door lock / solenoid / servo (prototype-scale for the school demo)
- Reed switch (door open/closed sensing)
- Buzzer
- Green LED, Red LED, Yellow LED
- Relay or MOSFET lock driver (**required** — see rule below)
- Power supply appropriate for the lock chosen

**Optional**
- MicroSD storage (alternative/supplement to internal flash for the offline queue)
- Backup battery
- Lock-position sensor (in addition to / instead of the reed switch)
- OLED/LCD display

## Critical hardware rule

> The ESP32 GPIO must **not** directly drive a high-current door lock.

```text
ESP32 GPIO → MOSFET / Relay Driver → Door Lock
```

Driving an inductive/high-current load straight from a GPIO pin risks damaging the ESP32 and is
not a safe or reliable design. Use a transistor/MOSFET or relay module rated for the lock's
voltage/current, with a flyback diode if the lock is inductive (solenoid/relay coil).

For the school demonstration, prefer a small, low-voltage model lock over anything wired to a
real building exit (see `PROJECT_BRIEF.md` Section 19).

## Pinout

Based on `firmware/esp32/src/config.h`:

| Function | ESP32 Pin | Notes |
|---|---|---|
| RC522 SDA/SS | GPIO 5 | |
| RC522 SCK | GPIO 18 | VSPI SCK |
| RC522 MOSI | GPIO 23 | VSPI MOSI |
| RC522 MISO | GPIO 19 | VSPI MISO |
| RC522 RST | GPIO 22 | |
| Reed switch | GPIO 27 | Input Pull-up |
| Lock driver (Relay) | GPIO 26 | Output to MOSFET/Relay |
| Buzzer | GPIO 14 | Active Buzzer |
| Green LED | GPIO 32 | Access Granted |
| Red LED | GPIO 33 | Access Denied |
| Yellow LED | GPIO 25 | Door Ajar Warning |

## Diagrams

Store wiring diagrams and schematics in `hardware/wiring/` and `hardware/diagrams/`.
