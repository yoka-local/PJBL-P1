# NFCKey ESP32 - Panduan Pengujian Firmware Fisik (FirmwareTest)

Direktori ini berisi kode firmware pengujian untuk prototipe fisik perangkat keras **NFCKey ESP32**. Kode telah disusun secara **modular multi-tab** sesuai standar pengujian dan instruksi pengajar.

---

## 1. Struktur File Multi-Tab

Buka file **`FirmwareTest.ino`** di Arduino IDE. Seluruh file berikut otomatis terbuka sebagai tab terpisah:

| Nama File / Tab | Fungsi & Tanggung Jawab |
| :--- | :--- |
| **`FirmwareTest.ino`** | Alur utama program (`setup()` dan `loop()`), mengoordinasikan seluruh sub-modul |
| **`Config.h`** | Pengaturan pinout GPIO, SSID & password Wi-Fi, kunci API Supabase, dan parameter timer |
| **`RfidModule.ino`** | Inisialisasi SPI MFRC522, penguatan antena (+48 dB), pembacaan UID, dan whitelist kartu |
| **`DoorModule.ino`** | Kontrol modul relay solenoid, LED Hijau, Merah, Kuning, dan Buzzer dengan proteksi booting |
| **`NetworkModule.ino`** | Manajemen koneksi Wi-Fi, antrean offline RAM, sinkronisasi Supabase REST API, dan heartbeat |

---

## 2. Tabel Pinout Wiring Hardware

Pastikan pemasangan kabel fisik pada ESP32 DevKit sesuai tabel berikut:

| Komponen | Pin Modul | Pin ESP32 | Keterangan & Catatan Penting |
| :--- | :--- | :--- | :--- |
| **RFID RC522** | **3.3V (VCC)** | **3V3** | ⚠️ **Wajib ke 3.3V! Jangan pernah hubungkan ke 5V/VIN!** |
| | GND | GND | Ground bersama |
| | RST | **GPIO 22** | Pin Reset RC522 |
| | MISO / SO | **GPIO 19** | SPI Master In Slave Out |
| | MOSI / SI | **GPIO 23** | SPI Master Out Slave In |
| | SCK | **GPIO 18** | SPI Clock |
| | SDA / NSS / CS | **GPIO 5** | SPI Chip Select |
| **Modul Relay** | IN | **GPIO 26** | Active LOW (`LOW` = Terbuka, `HIGH` = Mengunci) |
| | VCC | 5V / VIN | Daya relay |
| | GND | GND | Ground |
| **LED Hijau** | Anoda (+) | **GPIO 32** | Lewat resistor 220 $\Omega$ ke pin GPIO, Katoda (-) ke GND |
| **LED Merah** | Anoda (+) | **GPIO 33** | Lewat resistor 220 $\Omega$ ke pin GPIO, Katoda (-) ke GND |
| **LED Kuning** | Anoda (+) | **GPIO 25** | Lewat resistor 220 $\Omega$ ke pin GPIO, Katoda (-) ke GND |
| **Piezo Buzzer** | Positif (+) | **GPIO 14** | Kaki negatif (-) ke GND |

---

## 3. Persiapan Arduino IDE Sebelum Upload

1. **Board Package:**
   - Masuk ke **Tools > Board > esp32 > ESP32 Dev Module**.
2. **Kecepatan Upload (Penting untuk Mempercepat Upload):**
   - Masuk ke **Tools > Upload Speed > pilih `921600`** (bukan 115200). Ini mempercepat proses flash firmware menjadi hanya 5–10 detik.
3. **Library yang Wajib Terpasang:**
   - Masuk ke **Tools > Manage Libraries...**
   - Cari dan install: **`MFRC522` by GithubCommunity** (versi 1.4.x).
4. **Serial Monitor:**
   - Atur baud rate Serial Monitor pada **`115200 baud`**.

---

## 4. Cara Pengujian & Indikator Sistem

### A. Indikator LED Kuning (Status Wi-Fi & Sistem)
- **Berkedip cepat:** ESP32 sedang mencoba menyambung ke Wi-Fi (`PJBLSimulation`).
- **Menyala solid (ON terus):** ESP32 berhasil terhubung ke Wi-Fi, mendapatkan alamat IP, dan siap berkomunikasi dengan Database Supabase.

### B. Pengujian Kartu Terdaftar (Akses Diterima)
- Tempelkan kartu putih / gantungan kunci dengan UID **`04:A3:92:7F`** (kartu bawaan yang terdaftar atas nama *Siswa Teladan* di database):
  1. Serial Monitor menampilkan:
     ```
     [RFID] >>> KARTU TERDETEKSI: 04:A3:92:7F <<<
     [DOOR] ✅ AKSI: Akses Diterima! Relay Solenoid TERBUKA.
     [QUEUE] Event GATE-01_... tersimpan di antrean RAM (1/20 pending)
     ```
  2. **LED Hijau menyala** dan relay berbunyi klik (solenoid terbuka).
  3. Buzzer membunyikan 2 nada ceria.
  4. Setelah **5 detik**, relay mengunci kembali secara otomatis (*Auto-Relock*) dan LED Hijau padam.
  5. Serial Monitor menampilkan:
     ```
     [SYNC] Mengunggah event GATE-01_... (04:A3:92:7F - Diterima) ke Database Supabase...
     [SYNC] ✅ BERHASIL! Supabase mencatat event absensi (HTTP 201).
     ```
  6. Di website dashboard kita, log absensi **Siswa Teladan** langsung muncul seketika secara real-time!

### C. Pengujian Kartu Asing (Akses Ditolak)
- Tempelkan kartu lain yang belum terdaftar:
  1. Serial Monitor menampilkan UID kartu tersebut (misalnya: `[RFID] >>> KARTU TERDETEKSI: B3:4C:11:09 <<<`).
  2. **LED Merah menyala** selama 1 detik dan buzzer membunyikan nada rendah peringatan.
  3. Relay tetap terkunci.
  4. Event tetap tercatat dan dikirim ke Supabase dengan status `"Ditolak"`.
  5. Anda dapat menyalin UID kartu tersebut dan menambahkannya ke file `RfidModule.ino` atau mendaftarkannya melalui menu **Cards** pada website!

### D. Pengujian Live Heartbeat Gateway
- Setiap 20 detik, ESP32 mengirim sinyal ping:
  ```
  [HEARTBEAT] ❤️ Ping status online GATE-01 terkirim ke Supabase (HTTP 204)
  ```
- Ini membuat indikator gateway **GATE-01** pada halaman **Dashboard** dan **Devices** di website menyala hijau (**Online**) secara langsung.
