# 🚀 NFCKey ESP32 - Panduan Firmware Prototipe Fisik (PrototypeTEST)

Direktori ini berisi kode firmware prototipe fisik fungsional untuk **ESP32 (32-Pin / 30-Pin DevKit)** menggunakan **Modul NFC PN532 V3 (Red Board)** pada proyek **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 📋 1. Struktur File Multi-Tab

Buka file **`PrototypeTEST.ino`** di Arduino IDE atau build melalui PlatformIO. Seluruh tab berikut bekerja secara terpadu:

| File / Tab | Fungsi & Tanggung Jawab |
| :--- | :--- |
| **`PrototypeTEST.ino`** | Alur utama program (`setup()` dan `loop()`), mengoordinasikan seluruh modul secara non-blocking. |
| **`Config.h`** | Pengaturan interface PN532 (SPI / I2C / HSU), pinout GPIO, SSID & password Wi-Fi, kunci Supabase (`GATE-01`), timer, dan polaritas relay. |
| **`NfcModule.ino`** | Driver modul **NFC PN532 V3 Merah** (`Adafruit_PN532`), inisialisasi SAM, deteksi tag NFC/e-Money (4 & 7 bytes UID), whitelist lokal & dynamic cloud cache. |
| **`DoorModule.ino`** | Mesin status pintu (*Door State Machine*), driver relay solenoid, sensor magnetik Reed Switch MC-38, LED & Buzzer. |
| **`NetworkModule.ino`** | Wi-Fi reconnect non-blocking, antrean offline-first, sinkronisasi presensi Supabase, live heartbeat (20s), dan auto-download kartu baru. |

---

## 🔴 2. Pengaturan Modul NFC PN532 V3 (Red Board)

Modul PN532 V3 Merah memiliki **2 Sakelar Kecil (DIP Switch)** pada papan PCB untuk memilih interface komunikasi:

### ⚙️ Posisi DIP Switch PN532 V3:
* **Mode SPI (Rekomendasi Default ESP32):**
  * `Switch 1` = **0 (OFF / Posisi L)**
  * `Switch 2` = **0 (OFF / Posisi L)**
* **Mode I2C (Hanya 4 Kabel):**
  * `Switch 1` = **0 (OFF / Posisi L)**
  * `Switch 2` = **1 (ON / Posisi H)**
  *(Jika menggunakan I2C, ubah `#define PN532_MODE PN532_INTERFACE_I2C` di `Config.h`)*

---

## 🔌 3. Tabel Wiring Hardware ESP32 (32-Pins)

### A. Modul NFC PN532 V3 Merah (Mode SPI - Default)
| Pin Modul PN532 V3 | Pin ESP32 (32-Pins) | Keterangan |
| :--- | :--- | :--- |
| **VCC** | **3V3** (atau **5V / VIN**) | Board PN532 merah memiliki regulator onboard 3.3V |
| **GND** | **GND** | Ground bersama |
| **SCK** | **GPIO 18** | SPI Clock (VSPI) |
| **MISO** | **GPIO 19** | SPI Master In Slave Out (VSPI) |
| **MOSI** | **GPIO 23** | SPI Master Out Slave In (VSPI) |
| **SS / SDA** | **GPIO 5** | SPI Chip Select |
| **RSTPD_N / RST** | **GPIO 22** | Pin Reset (Opsional) |

*(Jika menggunakan **Mode I2C**: Cukup hubungkan **SDA $\rightarrow$ GPIO 21**, **SCL $\rightarrow$ GPIO 22**, VCC, dan GND)*

### B. Aktuator & Sensor Pintu
| Komponen | Pin Modul | Pin ESP32 | Keterangan & Catatan Keamanan |
| :--- | :--- | :--- | :--- |
| **Relay Solenoid** | IN | **GPIO 26** | Active LOW (`LOW` = Buka, `HIGH` = Kunci) |
| | VCC | 5V / VIN | Sumber tegangan koil 5V |
| | GND | GND | Ground bersama |
| **Reed Switch** | Kabel 1 | **GPIO 27** | Internal `INPUT_PULLUP` aktif |
| (MC-38) | Kabel 2 | GND | Kontak terhubung saat magnet dekat (Pintu Tertutup) |
| **LED Hijau** | Anoda (+) | **GPIO 32** | Lewat resistor 220 $\Omega$ (Akses Diterima) |
| **LED Merah** | Anoda (+) | **GPIO 33** | Lewat resistor 220 $\Omega$ (Akses Ditolak & Alarm Strobe) |
| **LED Kuning** | Anoda (+) | **GPIO 25** | Lewat resistor 220 $\Omega$ (Status Wi-Fi & Peringatan Door Ajar) |
| **Buzzer Modul (3-Pin)** | I/O (S / Signal) | **GPIO 14** | VCC ke 5V / 3V3, GND ke GND |

> 💡 **Tips Pengujian di Meja Kerja:** Jika sedang menguji tanpa memasang sakelar reed switch di pintu, ubah `#define USE_DOOR_MAGNET_SENSOR false` di `Config.h` agar pintu mengunci otomatis setelah 5 detik tanpa memicu sirine pembobolan.

---

## ⚡ 4. Pengujian 6 Kondisi Operasional (Condition 1 s.d. 6)

1. **🟢 Condition 1: Akses Diterima (Normal Operation)**
   - Tempelkan kartu/e-Money terdaftar (`04:A3:92:7F` atau kartu terdaftar di Web Dashboard).
   - Solenoid terbuka (Relay ON), LED Hijau menyala, buzzer membunyikan 2 nada ceria.
   - Pintu didorong terbuka $\rightarrow$ Reed Switch mendeteksi `OPEN`.
   - Pintu ditutup kembali $\rightarrow$ Reed Switch mendeteksi `CLOSED` $\rightarrow$ Solenoid langsung mengunci seketika dan LED Hijau padam!
   - Log presensi langsung terkirim ke Supabase REST API.

2. **⚡ Condition 2: Safe Cold-Boot (Anti-Glitch Relay)**
   - Saat ESP32 pertama kali dinyalakan atau restart, relay dijamin **tidak berbunyi klik / tidak terbuka sesaat** (*Fail-Secure*).

3. **🔴 Condition 3: Akses Ditolak (Kartu Tidak Terdaftar)**
   - Relay tetap terkunci, LED Merah menyala 1 detik, buzzer membunyikan nada rendah peringatan. Percobaan akses tetap dicatat ke database untuk audit.

4. **⚠️ Condition 4: Door Ajar Alert (Pintu Terbuka > 30 Detik)**
   - Jika pintu dibiarkan terbuka lebih dari 30 detik: LED Kuning berkedip cepat dan Buzzer berbunyi intermiten (*Beep... Beep...*). Alarm otomatis padam saat pintu ditutup rapat kembali.

5. **🚨 Condition 5: Forced Entry Alarm (Pintu Didobrak Paksa)**
   - Jika pintu dibuka paksa saat sistem berada dalam status `LOCKED` tanpa tap kartu sah: Buzzer membunyikan sirine darurat kencang secara kontinu dan LED Merah berkedip *strobe*.

6. **📡 Condition 6: Offline-First & Real-time Cloud Sync**
   - Tap kartu/e-Money tetap berfungsi normal saat Wi-Fi padam dengan verifikasi cache lokal.
   - Event disimpan dalam antrean offline (FIFO).
   - Begitu Wi-Fi kembali terhubung, antrean otomatis disinkronkan ke Supabase Cloud tanpa kehilangan data (*idempotent*).
   - Gateway mengirim *heartbeat* setiap 20 detik sehingga status di Web Dashboard selalu hijau (**Online**).

---

## 🛠️ 5. Cara Upload Firmware

### Menggunakan Arduino IDE:
1. Pasang library **`Adafruit PN532`** dari **Tools > Manage Libraries...**
2. Buka Arduino IDE, klik **File > Open**, lalu buka `PrototypeTEST/PrototypeTEST.ino`. Seluruh tab modul akan terbuka otomatis.
3. Pilih Board: **Tools > Board > esp32 > ESP32 Dev Module**.
4. Atur **Tools > Upload Speed** ke **`921600`**.
5. Pasang kabel USB ke ESP32, pilih Port COM yang sesuai, lalu klik **Upload** (Ctrl + U).
6. Buka **Serial Monitor** pada kecepatan **`115200 baud`**.

### Menggunakan PlatformIO (CLI / VS Code):
Jalankan perintah berikut:
```bash
pio run -d firmware/esp32 -t upload
pio device monitor -b 115200
```
