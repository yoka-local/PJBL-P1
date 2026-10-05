# 🔌 ESP32 Firmware

Firmware untuk mikrokontroler ESP32 pada sistem **NFCKey**.

## Komponen
- `main.cpp` - Titik awal program
- `wifi_manager.cpp` - Menangani koneksi Wi-Fi non-blocking
- `rfid_reader.cpp` - Antarmuka MFRC522 (SPI)
- `door_controller.cpp` - Mesin state untuk mengontrol solenoid dan reed switch
- `event_queue.cpp` - Antrian event absensi offline-first (LittleFS/SPIFFS)
- `sync_manager.cpp` - Menyinkronkan data offline ke Laravel backend

## Cara Build
Gunakan [PlatformIO](https://platformio.org/). Buka folder `firmware/esp32` di VS Code dengan ekstensi PlatformIO terinstal, lalu klik `Build` dan `Upload`.

Untuk dokumentasi lengkap, silakan lihat [FIRMWARE.md](../../docs/FIRMWARE.md) dan [IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md).
