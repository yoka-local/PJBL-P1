# 🔌 NFCKey Firmware Directory

Direktori ini berisi seluruh kode sumber perangkat lunak mikrokontroler (*firmware*) untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 📂 Struktur Direktori

- **[`esp32/`](./esp32/)**: Firmware untuk mikrokontroler ESP32 DevKit v4.
  - **`NFCKey_Hardware_IRL/`**: Firmware prototipe fisik lengkap multi-tab (PN532 NFC + MFRC522 RFID, Relay, Reed Switch, 6 kondisi operasional).
  - **`wokwi_simulation/`**: Firmware simulasi interaktif mandiri yang dapat langsung disimulasikan di [Wokwi.com](https://wokwi.com).
  - **`src/`**: Source code C++ modular untuk PlatformIO.
  - **`platformio.ini`**: Konfigurasi build PlatformIO.

Untuk panduan lengkap wiring pinout dan cara flash, silakan buka [Panduan ESP32 Firmware](./esp32/README.md).
