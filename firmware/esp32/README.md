# 🔌 ESP32 Firmware — NFCKey Smart Access & Attendance

Firmware mikrokontroler **ESP32** untuk sistem **NFCKey (Smart NFC Attendance & Door Access System)**. Mendukung pembacaan **NFC PN532 V3 (Prioritas)** dan **RFID MFRC522 (Cadangan)**, proteksi safe cold-boot relay, mesin status pintu otonom, antrean penyimpanan *offline-first*, serta sinkronisasi cloud real-time ke **Supabase** dan **Laravel REST API**.

---

## 🌟 Fitur Unggulan Firmware

1. **Dual Reader Support (NFC + RFID):**
   - **NFC PN532 V3 (Red Board):** Mode SPI (Software SPI) untuk stabilitas tinggi, mendukung pembacaan kartu NFC, smart tag, dan e-Money dengan UID 4-byte dan 7-byte.
   - **MFRC522:** Pembaca RFID 13.56 MHz standar Mifare Classic 1K dengan pengaturan gain antena maksimal (+48dB).
2. **Mesin Status Pintu Otonom (Door State Machine):**
   - 5 Status eksplisit: `LOCKED`, `UNLOCKED_WAITING`, `DOOR_OPEN`, `DOOR_AJAR`, dan `FORCED_ENTRY`.
   - Mengendalikan relay solenoid, sensor magnet Reed Switch MC-38, LED 3-warna, dan buzzer secara non-blocking.
3. **Safe Cold-Boot Relay Protection:**
   - Menghilangkan *glitch clicking* relay saat ESP32 pertama kali dinyalakan atau restart mendadak.
4. **Keandalan Offline-First (Offline Queue):**
   - RAM Ring Buffer FIFO berkapasitas 30 rekaman. Tap kartu tetap membuka pintu dan mencatat event saat Wi-Fi padam.
   - Auto-drain queue yang otomatis mengirimkan seluruh data pending secara berurutan begitu koneksi Wi-Fi pulih kembali (*Delete-only-on-confirmation*).
5. **Real-time Cloud Gateway Heartbeat:**
   - Mengirimkan ping detak jantung ke Supabase / Laravel setiap 20 detik untuk mengindikasikan status online gerbang (`GATE-01`) di dashboard web.
6. **Whitelist Cache Dinamis:**
   - Secara periodik mengunduh daftar kartu aktif dari cloud sehingga penambahan kartu di web langsung berlaku di alat fisik tanpa perlu upload firmware baru.

---

## 📂 Struktur Direktori Firmware

```text
firmware/esp32/
├── platformio.ini         # Konfigurasi PlatformIO untuk build & upload
├── diagram.json           # Skema diagram sirkuit Wokwi untuk VS Code extension
├── wokwi.toml             # Konfigurasi emulator Wokwi Simulator
├── .env.example           # Template kredensial Wi-Fi & API
│
├── NFCKey_Hardware_IRL/   # Firmware Prototipe Fisik Utama (Multi-Tab Arduino / PIO)
│   ├── NFCKey_Hardware_IRL.ino  # Main Loop & Orchestrator
│   ├── Config.h                 # Pinout, Kredensial, Timer, & Polaritas
│   ├── DoorModule.ino           # Logika Relay, Reed Switch, LED, & Buzzer
│   ├── NfcModule.ino            # Driver PN532 SPI & Whitelist Cache
│   ├── NetworkModule.ino        # Wi-Fi Non-blocking & Supabase Sync
│   └── README.md                # Panduan teknis pengujian fisik
│
├── wokwi_simulation/      # Firmware Simulasi Interaktif Wokwi (Standalone)
│   ├── wokwi_sketch.ino   # Single-file sketch untuk Wokwi Web / VS Code
│   ├── diagram.json       # Skema sirkuit rapi dengan bus paralel ortogonal
│   ├── wokwi.toml         # Konfigurasi file binary simulasi
│   ├── libraries.txt      # Library MFRC522
│   └── README.md          # Panduan skenario uji interaktif Wokwi
│
└── src/                   # Source code C++ modular alternatif
    ├── main.cpp
    ├── config.h
    ├── door_controller.cpp
    ├── event_queue.cpp
    ├── rfid_reader.cpp
    ├── sync_manager.cpp
    └── wifi_manager.cpp
```

---

## 🔌 Tabel Pinout & Sambungan Hardware

| Komponen | Pin Modul | Pin ESP32 (32-Pins) | Keterangan & Catatan |
| :--- | :---: | :---: | :--- |
| **NFC PN532 SCK** | `SCK` | **GPIO 18** | SPI Clock |
| **NFC PN532 MISO**| `MISO` | **GPIO 19** | SPI Master In Slave Out |
| **NFC PN532 MOSI**| `MOSI` | **GPIO 23** | SPI Master Out Slave In |
| **NFC PN532 SS** | `SDA / SS` | **GPIO 5** | SPI Chip Select |
| **NFC PN532 RST** | `RSTPD_N` | **GPIO 22** | Pin Reset modul |
| **Relay Solenoid**| `IN` | **GPIO 26** | Active LOW (`LOW` = Buka, `HIGH` = Kunci) |
| **Reed Switch** | Kabel 1 (Kabel 2 ke GND) | **GPIO 27** | Internal `INPUT_PULLUP` (`LOW` = Tutup, `HIGH` = Buka) |
| **LED Hijau** | Anoda (+) | **GPIO 32** | Lewat resistor 220 $\Omega$ (Akses Diterima) |
| **LED Merah** | Anoda (+) | **GPIO 33** | Lewat resistor 220 $\Omega$ (Akses Ditolak & Alarm Strobe) |
| **LED Kuning** | Anoda (+) | **GPIO 25** | Lewat resistor 220 $\Omega$ (Status Wi-Fi & Door Ajar) |
| **Active Buzzer** | `I/O` (S) | **GPIO 14** | Audio Feedback & Sirine Darurat |
| **VCC Sensor** | `VCC` | **3V3** | Tegangan 3.3V teregulasi |
| **VCC Aktuator** | `VCC` / `VIN` | **VIN / 5V** | Tegangan 5V dari LM2596 |
| **Ground** | `GND` | **GND** | Common Ground |

---

## ⚙️ Pengaturan DIP Switch PN532 V3 (Red Board)

Pastikan sakelar geser kecil pada modul PN532 berada pada posisi **Mode SPI**:
* `Switch 1` = **OFF (Posisi 0 / L)**
* `Switch 2` = **OFF (Posisi 0 / L)**

---

## 🛠️ Cara Kompilasi & Flash Firmware

### Menggunakan PlatformIO (Direkomendasikan)
1. Buka terminal di folder `firmware/esp32`.
2. Kompilasi firmware fisik:
   ```bash
   pio run -e hardware_irl
   ```
3. Hubungkan ESP32 via kabel USB dan upload:
   ```bash
   pio run -e hardware_irl -t upload
   ```
4. Buka Serial Monitor (115200 baud):
   ```bash
   pio device monitor -b 115200
   ```

### Menggunakan Arduino IDE
1. Buka Arduino IDE.
2. Buka file `NFCKey_Hardware_IRL/NFCKey_Hardware_IRL.ino`.
3. Dari Library Manager, pasang **`Adafruit PN532`** dan **`MFRC522`**.
4. Pilih board **ESP32 Dev Module** dan port COM yang sesuai.
5. Klik **Upload**.
