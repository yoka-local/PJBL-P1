# 🛠️ Identifikasi Alat & Spesifikasi Teknis Hardware (Hardware & Technical Specifications)

Dokumen ini memuat identifikasi menyeluruh, parameter arsitektur mikrokontroler (*dual-core*, alokasi memori, partisi flash), dan spesifikasi teknis mendalam dari seluruh komponen, modul, catu daya, dan perkakas pada proyek **NFCKey (Smart NFC Attendance & Door Access System)**.

---

## 🧠 1. Komputasi & Pemrosesan Inti (Core Controller & Architecture)

### 1. ESP32 DevKit V1 / NodeMCU (WROOM-32)
* **Peran:** *"The Brain of the Project"* (Otak dan Pusat Kendali Sistem)
* **Arsitektur Pemroses (CPU):**
  * **Processor:** Dual-Core 32-bit Xtensa LX6 Microprocessor.
  * **Clock Frequency:** Dapat diatur hingga 240 MHz (performa komputasi hingga 600 DMIPS).
  * **Distribusi Tugas Dual-Core (Multitasking):**
    * **Core 0 (Protocol Core):** Mengelola koneksi Wi-Fi 802.11 b/g/n, TCP/IP stack, enkripsi TLS/HTTPS, dan tugas sinkronisasi *background* `sync_manager` via FreeRTOS.
    * **Core 1 (Application Core):** Menjalankan siklus utama Arduino (`setup()` dan `loop()`), *polling* bus SPI modul pembaca NFC/RFID, pemantauan sensor *Reed Switch*, serta mesin status pintu non-blocking (`DoorState`).
* **Struktur & Alokasi Memori (Memory Layout):**
  * **Internal SRAM:** **520 KB** (SRAM0, SRAM1, dan SRAM2 yang dialokasikan untuk heap alokasi dinamis `ArduinoJson`, stack pemanggilan fungsi, dan buffer HTTPClient).
  * **Internal ROM:** **448 KB** (Berisi kode booting sistem dan fungsi kriptografi dasar).
  * **RTC Fast Memory:** **8 KB** SRAM (Diakses langsung oleh CPU utama saat bangun dari deep sleep).
  * **RTC Slow Memory:** **8 KB** SRAM (Dapat diakses oleh *Ultra Low Power (ULP) Co-processor*).
* **Penyimpanan Flash Eksternal (Flash Memory):**
  * **Kapasitas Flash:** **4 MB (32 Megabits)** SPI Flash (Quad SPI / QIO mode @ 40/80 MHz).
  * **Skema Partisi Flash (Partition Table):**
    * `nvs` (Non-Volatile Storage): ~20 KB (Penyimpanan parameter konfigurasi & Wi-Fi).
    * `otadata`: ~8 KB (Manajemen pemilihan partisi boot OTA).
    * `app0` (Factory / Main Application): ~1.25 MB (Binary executable firmware hasil build PlatformIO).
    * `app1` (OTA Update Slot): ~1.25 MB (Slot cadangan untuk pembaruan over-the-air).
    * `spiffs` / `littlefs` (Data Storage): **~1.4 MB** — Didedikasikan khusus sebagai antrean penyimpanan offline (`event_queue`) untuk menampung rekaman absensi siswa format JSON saat Wi-Fi padam.
* **Karakteristik Elektrikal & Logika Pin:**
  * **Tegangan Operasional Chip:** **3.3V DC** (Toleransi batas absolut: 3.0V – 3.6V).
  * **Logic Level GPIO:** 3.3V TTL (Level HIGH $\ge 2.64\text{V}$, level LOW $\le 0.8\text{V}$). **Peringatan:** GPIO ESP32 **TIDAK 5V-Tolerant**.
  * **Input Catu Daya:** Pin **VIN / 5V** menerima tegangan teregulasi 5.0V dari output modul LM2596 (dialirkan ke regulator LDO onboard AMS1117-3.3).

---

## 📡 2. Sensor & Identifikasi Masukan (Inputs & Sensing)

### 2. Modul Pembaca NFC/RFID (PN532 V3 / RC522)
* **Peran:** *"The Scanner / The Eyes"* (Sensor Pengenal Identitas)
* **Spesifikasi Teknis:**
  * **Frekuensi Kerja:** **13.56 MHz** (High Frequency / HF RFID).
  * **Antarmuka Komunikasi:** SPI (Serial Peripheral Interface) menggunakan bus VSPI ESP32 (SCK: GPIO 18, MISO: GPIO 19, MOSI: GPIO 23, SS/SDA: GPIO 5, RST: GPIO 22).
  * **Kecepatan Transfer SPI:** Mendukung hingga 10 Mbps.
  * **Protokol Kartu yang Didukung:**
    * ISO/IEC 14443 Type A & MIFARE (Mifare Classic 1K/4K, Mifare Ultralight).
    * Tag NFC Forum Type 1–4 (NTAG213, NTAG215, NTAG216).
    * Kompatibilitas kartu e-Money perbankan (Mandiri e-Money, Flazz BCA, Brizzi) serta emulasi NFC smartphone (didukung secara optimal oleh modul PN532).
  * **Jarak Deteksi Operasional:** 0 hingga 5 cm (tergantung geometri antena dan penghalang fisik).
  * **Tegangan Kerja:** **3.3V DC** (Dihubungkan ke pin 3V3 ESP32; modul tidak boleh diberi 5V pada jalur VCC).

### 3. Magnetic Reed Switch (MC-38)
* **Peran:** *"The Door Senses"* (Indra Status Posisi Pintu)
* **Spesifikasi Teknis:**
  * **Tipe Sakelar:** Kontak Magnetik Pasif tipe *Normally Closed (NC)* (saat magnet menempel/pintu tertutup, kontak terhubung ke GND; saat magnet menjauh/pintu terbuka, kontak terputus).
  * **Jarak Pemicuan (Operating Gap):** 15 mm – 25 mm.
  * **Rating Elektrik:** Tegangan maksimum 100V DC, arus maksimum 0.5A.
  * **Koneksi:** Kabel 1 ke **GPIO 27** (diaktifkan internal `INPUT_PULLUP`), Kabel 2 ke **GND**.

---

## ⚡ 3. Aktuator, Pengaman & Indikator (Outputs & Feedback)

### 4. Mini Solenoid Door Lock 12V
* **Peran:** *"The Muscle / The Physical Deadbolt"* (Lidah Pengunci Mekanis)
* **Spesifikasi Teknis:**
  * **Mode Keamanan:** **Fail-Secure (Normally Closed)** — Pintu tetap terkunci rapat saat tidak ada listrik untuk menjaga keamanan ruangan.
  * **Tegangan Nominal:** **12V DC**.
  * **Konsumsi Arus:** $\approx 1.1\text{A}$ saat aktif (Daya sesaat: $\approx 13.2\text{ Watt}$).
  * **Panjang Langkah Lidah Kunci (Stroke):** 10 mm.
  * **Batas Durasi Aktif (Duty Cycle):** Maksimum 10 detik kontinu (untuk mencegah kumparan koil mengalami *overheating*).

### 5. Modul Relay 1-Channel 5V
* **Peran:** *"The Heavy Switch / Electrical Gatekeeper"* (Sakelar Elektrik Pengaman)
* **Spesifikasi Teknis:**
  * **Tegangan Koil Pemicu:** 5V DC (Pin VCC terhubung ke output 5V LM2596, pin IN terhubung ke GPIO 26).
  * **Kapasitas Kontak Relay:** 10A 250VAC / 10A 30VDC.
  * **Isolasi Optik:** Menggunakan optocoupler (PC817) untuk mengisolasi noise elektrik induktif solenoid dari ESP32.

### 6. Dioda Flyback 1N4007
* **Peran:** *"The Circuit Shield"* (Peredam Lonjakan Tegangan Induktif)
* **Spesifikasi Teknis:**
  * **Peak Reverse Voltage ($V_{RRM}$):** 1000V.
  * **Arus Terusan Rata-rata ($I_{F}$):** 1.0A.
  * **Pemasangan:** Paralel terbalik (*reverse biased*) pada terminal positif dan negatif solenoid untuk menyerap lonjakan *back-EMF kickback*.

### 7. Active Buzzer 5V
* **Peran:** *"The Voice / Alarm Siren"* (Indikator Audio & Sirine)
* **Spesifikasi Teknis:**
  * **Tegangan Operasional:** 3.5V – 5.5V DC (Dikontrol langsung via GPIO 14).
  * **Frekuensi Resonansi:** $\approx 2300\text{ Hz} \pm 300\text{ Hz}$ (Menghasilkan nada bip nyaring dengan suplai tegangan DC tanpa memerlukan generator PWM kompleks).
  * **Tingkat Tekanan Suara (SPL):** $\ge 85\text{ dB}$ pada jarak 10 cm.

### 8. LED Indikator 5mm & Resistor Pembatas Arus
* **LED Hijau, Merah, Kuning (5mm Diffused):**
  * LED Hijau (GPIO 32, $V_f \approx 2.1\text{V}$) $\rightarrow$ Status Akses Diterima.
  * LED Merah (GPIO 33, $V_f \approx 1.9\text{V}$) $\rightarrow$ Status Akses Ditolak & Alarm Pembobolan.
  * LED Kuning (GPIO 25, $V_f \approx 2.0\text{V}$) $\rightarrow$ Status Peringatan Pintu Terbuka Lama (>30 detik).
* **Resistor 220 $\Omega$ (1/4 Watt, Toleransi 5%):**
  * Membatasi arus maju ($I_f$) dari pin GPIO 3.3V ESP32 pada kisaran aman $\approx 5.5\text{ mA} - 6.3\text{ mA}$ per LED.

---

## 🔌 4. Sistem Catu Daya & Regulasi Tegangan

### 9. Adaptor DC 12V 2A
* **Input:** AC 100–240V, 50/60 Hz.
* **Output:** DC 12V $\pm 5\%$, arus maksimum 2.0A (Daya total 24 Watt).
* **Konektor:** DC Barrel Jack standar 5.5 x 2.1 mm (Center Positive).

### 10. Modul Step-Down Buck Converter (LM2596)
* **Tegangan Input:** DC 4.5V – 40V (Dihubungkan ke output Adaptor 12V).
* **Tegangan Output:** Diatur presisi menggunakan trimpot multi-turn pada **5.0V DC $\pm 0.05\text{V}$**.
* **Arus Output:** 2A kontinu (maksimum 3A dengan pendingin).
* **Frekuensi Switching:** 150 kHz dengan efisiensi konversi hingga 92%.
* **Fungsi Utama:** Memungkinkan pengoperasian Solenoid 12V dan ESP32 5V secara bersamaan hanya dengan **satu buah adaptor colokan**.

---

## 🧰 5. Prototyping & Perkakas Perakitan

1. **Breadboard Half-Size (400 Tie-Points):** Papan rangkaian tanpa solder dengan bus tegangan terpisah.
2. **Kabel Jumper Dupont (40 pcs):** Jalur penghubung Female-Female, Male-Female, dan Male-Male.
3. **Multimeter Digital (Avometer):** Alat ukur wajib untuk memverifikasi tegangan output LM2596 tepat di 5.0V sebelum disambungkan ke pin VIN ESP32 guna mencegah kerusakan akibat *overvoltage*.
4. **Obeng Presisi:** Untuk menyetel trimpot tegangan LM2596 dan mengencangkan terminal sekrup Jack DC serta Relay.
5. **Kotak Enclosure & Double Tape Foam 3M:** Rumah pelindung rangkaian di sisi dalam pintu ruangan.
