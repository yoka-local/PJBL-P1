# NFCKey ESP32 - Panduan Wokwi Simulator Setup

Direktori ini berisi seluruh konfigurasi yang dibutuhkan untuk menjalankan simulasi interaktif perangkat keras **NFCKey ESP32** secara akurat dan bersih di **[Wokwi Simulator](https://wokwi.com)**.

---

## 1. Daftar Komponen yang Disimulasikan

| Komponen | Identitas / Pin | Fungsi & Keterangan |
| :--- | :--- | :--- |
| **ESP32 DevKit v4** | `esp` | Mikrokontroler utama |
| **RFID Reader MFRC522** | `rfid` (SS=5, SCK=18, MOSI=23, MISO=19, RST=22, 3.3V) | Pembaca kartu NFC/RFID (SPI Bus) |
| **Modul Relay 5V** | `relay` (IN=GPIO 26, VCC=5V, GND=GND) | Pengendali saklar daya solenoid pintu |
| **Indikator Solenoid Lock** | `led_solenoid` (Biru) + `r_solenoid` (220 $\Omega$) | Meniru solenoid lock fisik (menyala saat relay terbuka) |
| **LED Hijau (Akses Diterima)** | `led_green` + `r_green` (220 $\Omega$, GPIO 32) | Indikator visual kartu terdaftar |
| **LED Merah (Akses Ditolak)** | `led_red` + `r_red` (220 $\Omega$, GPIO 33) | Indikator visual kartu ditolak / alarm |
| **LED Kuning (Pintu Terbuka)** | `led_yellow` + `r_yellow` (220 $\Omega$, GPIO 25) | Indikator peringatan pintu terbuka terlalu lama |
| **Sensor Magnet Pintu (Reed Switch)** | `reed` (Slide Switch, GPIO 27, INPUT_PULLUP) | Meniru kontak magnet kusen pintu |
| **Piezo Buzzer 5V** | `buzzer` (GPIO 14) | Audio feedback nada sukses, ditolak, dan sirene alarm |

> [!NOTE]
> Seluruh LED dilengkapi dengan **resistor 220 $\Omega$** untuk memenuhi kaidah elektronika standar dan menjaga kabel tetap rapi serta mudah dibaca.

---

## 2. Cara Menjalankan di Wokwi Web (wokwi.com)

1. Buka browser dan kunjungi **[wokwi.com](https://wokwi.com)**.
2. Pilih **ESP32** (atau "Start from Scratch" -> ESP32).
3. **Pasang Library**:
   - Klik ikon **Library Manager** (tab kedua di panel kode).
   - Tambahkan library: **`MFRC522`**.
4. **Salin Skema Kabel (`diagram.json`)**:
   - Buka tab `diagram.json`.
   - Timpa seluruh isinya dengan kode dari file [`diagram.json`](diagram.json).
5. **Salin Kode Firmware (`sketch.ino`)**:
   - Buka tab `sketch.ino`.
   - Timpa seluruh isinya dengan kode dari file [`wokwi_sketch.ino`](wokwi_sketch.ino).
6. **Mulai Simulasi**:
   - Klik tombol hijau **Play / Start Simulation**.

---

## 3. Cara Menjalankan di VS Code Extension (Wokwi)

1. Pasang extension **Wokwi Simulator** di VS Code.
2. Buka workspace project ini.
3. Buka file [`firmware/esp32/diagram.json`](../diagram.json).
4. Tekan tombol `F1` di VS Code, lalu ketik dan pilih: **`Wokwi: Start Simulator`**.

---

## 4. Skenario Pengujian Interaktif

### A. Kartu Terdaftar (Akses Diterima)
1. Klik modul **MFRC522** di layar simulator.
2. Pilih kartu default biru (**UID `04:A3:92:7F`**, terdaftar atas nama *Siswa Teladan*).
3. **Hasil**:
   - Modul Relay berbunyi klik dan aktif.
   - Indikator **Solenoid Lock (Biru)** menyala terang.
   - **LED Hijau** menyala.
   - Buzzer membunyikan 2 nada ceria.
   - Log absensi dikirim otomatis ke Supabase melalui Wi-Fi virtual (`Wokwi-GUEST`).
   - Layar Dashboard website menampilkan nama **Siswa Teladan** secara real-time!

### B. Kartu Tidak Terdaftar (Akses Ditolak)
1. Klik modul MFRC522 dan pilih kartu merah (**UID `AA:BB:CC:DD`**).
2. **Hasil**:
   - **LED Merah** menyala.
   - Buzzer membunyikan nada rendah peringatan.
   - Solenoid tetap terkunci.
   - Log kartu ditolak tercatat di Supabase dan dashboard.

### C. Simulasi Sensor Magnet Pintu (Reed Switch)
- **Membuka & Menutup Pintu**:
  Setelah tap kartu valid, geser **Slide Switch** (GPIO 27) untuk menyimulasikan pintu dibuka. Geser kembali ke posisi awal untuk menyimulasikan pintu tertutup. Relay dan solenoid langsung mengunci kembali seketika.
- **Auto-Relock 5 Detik**:
  Jika kartu di-tap namun pintu tidak dibuka dalam 5 detik, sistem otomatis mengunci kembali relai.
- **Alarm Pintu Dibiarkan Terbuka (Door Ajar)**:
  Buka pintu (geser switch) dan biarkan selama >20 detik. **LED Kuning** akan menyala dan buzzer akan berbunyi intermiten hingga switch ditutup kembali.
