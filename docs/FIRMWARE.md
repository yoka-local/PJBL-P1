# 💻 Firmware Architecture & Engineering Guide — NFCKey ESP32

Dokumentasi teknis rancang bangun perangkat lunak mikrokontroler (*Firmware*) pada sistem **NFCKey (Smart NFC Attendance & Door Access System)** berbasis **ESP32 DevKit v4**.

---

## 🏗️ 1. Filosofi Desain & Multi-Tab Modular Architecture

Firmware dirancang dengan prinsip **Reliabilitas > Keamanan > Kebenaran Fungsi**. Untuk menghindari kode monolitik yang sulit di-debug, sistem dipecah menjadi modul-modul independen (*multi-tab*) yang dikoordinasikan oleh loop utama non-blocking:

| Modul File | Tanggung Jawab & Abstraksi |
| :--- | :--- |
| **`NFCKey_Hardware_IRL.ino`** | Titik masuk utama (`setup()` dan `loop()`), orchestrator non-blocking antarsub-sistem. |
| **`Config.h`** | Sentralisasi pinout GPIO, SSID/Password Wi-Fi, kunci Supabase REST API, timer, dan polaritas relay/buzzer. |
| **`NfcModule.ino`** | Driver modul **NFC PN532 V3 (SPI)** dan **MFRC522 (RFID)**, SAMConfig auto-recovery, gain antena +48dB, dan dynamic whitelist cache. |
| **`DoorModule.ino`** | Mesin status pintu (*Door State Machine*), driver relay solenoid, sensor magnetik Reed Switch MC-38, LED & Buzzer. |
| **`NetworkModule.ino`** | Manajer Wi-Fi non-blocking, antrean offline-first (FIFO RAM Buffer), sinkronisasi presensi Supabase, live heartbeat gateway, dan auto-download kartu baru. |

---

## ⚡ 2. Loop Non-Blocking (Cooperative Multitasking)

Seluruh fungsi pada firmware dieksekusi tanpa menggunakan `delay()` panjang yang dapat membekukan responsivitas alat (*freeze*). Setiap subsistem dievaluasi pada setiap siklus `loop()` menggunakan timer berbasis `millis()`:

```cpp
void loop() {
    // 1. Kelola koneksi Wi-Fi di latar belakang (non-blocking)
    wifi_update();

    // 2. Polling pembaca NFC/RFID untuk mendeteksi kartu
    String uid = nfc_scan();
    if (uid.length() > 0) {
        process_card_tap(uid);
    }

    // 3. Evaluasi mesin status pintu (timeout relock, reed switch, alarm)
    door_update();

    // 4. Sinkronisasi antrean offline ke server saat Wi-Fi terhubung
    network_sync_update();

    // 5. Ping detak jantung gateway ke dashboard
    heartbeat_update();
}
```

---

## 🚪 3. Implementasi Mesin Status Pintu (Door State Machine)

Mesin status didefinisikan secara eksplisit menggunakan tipe `enum class DoorState`:

```cpp
enum class DoorState {
    LOCKED,             // Pintu terkunci aman (Default)
    UNLOCKED_WAITING,   // Akses diterima, menunggu pintu dibuka (5s Window)
    DOOR_OPEN,          // Pintu fisik sedang dibuka oleh pengguna
    DOOR_AJAR,          // Pintu dibiarkan terbuka terlalu lama (>30s)
    FORCED_ENTRY        // Pintu didobrak paksa tanpa tap kartu sah
};
```

### Logika Transisi State:
1. **Transisi ke `UNLOCKED_WAITING`:**
   Dipicu saat kartu terdaftar di-tap. Relay diaktifkan, LED Hijau menyala, buzzer membunyikan 2 nada ceria. Timer `doorUnlockTime = millis()` dicatat.
2. **Auto-Relock (Pintu Tidak Dibuka):**
   Jika dalam 5 detik (`UNLOCK_HOLD_TIME_MS`) sensor reed switch tetap mendeteksi pintu tertutup, relay otomatis dikunci kembali dan status kembali ke `LOCKED`.
3. **Deteksi `DOOR_OPEN`:**
   Saat pintu didorong, reed switch mendeteksi `HIGH`. Sistem mencatat `doorOpenedTime = millis()`.
4. **Relock Instan saat Pintu Ditutup:**
   Begitu reed switch mendeteksi pintu kembali tertutup (`LOW`), relay langsung mengunci seketika tanpa menunggu timer habis.
5. **Peringatan `DOOR_AJAR`:**
   Jika pintu tetap terbuka selama >30 detik (`TIMEOUT_DOOR_OPEN_MS`), status berpindah ke `DOOR_AJAR`. LED Kuning berkedip cepat dan buzzer berbunyi *beep... beep...* secara intermiten hingga pintu dirapatkan kembali.
6. **Alarm `FORCED_ENTRY`:**
   Jika reed switch mendeteksi pintu terbuka saat status berada pada `LOCKED`, buzzer langsung membunyikan sirine darurat berkecepatan tinggi dan LED Merah berkedip *strobe*.

---

## 📶 4. Keandalan Offline-First & Buffer Antrean (FIFO Queue)

Untuk menjamin **tidak ada satu pun data absensi yang hilang** saat koneksi Wi-Fi terputus:

```text
[Tap Kartu] ───> [Validasi Cache Lokal] ───> [Buka Pintu]
                       │
                       └───> [Simpan ke Offline FIFO Buffer]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [Wi-Fi Tersedia]                           [Wi-Fi Terputus]
                   │                                           │
          [Kirim HTTP POST]                         [Tetap Simpan di RAM]
                   │                                           │
         [Konfirmasi 200/201]                        [Tunggu Reconnect]
                   │                                           │
          [Hapus dari Buffer] ◄────────────────────────────────┘
```

* **Ukuran Buffer:** RAM Ring Buffer menampung hingga 30 event pending.
* **Format Event:** Struct `AttendanceEvent` menyimpan `event_id` (UUIDv4 unik), `card_uid`, `device_id`, `status`, dan `timestamp`.
* **Prinsip Hapus Hanya Saat Konfirmasi:** Rekaman hanya dihapus dari antrean jika server merespons dengan HTTP 200/201 (termasuk status `{ duplicate: true }`).

---

## 📇 5. Driver NFC PN532 & Whitelist Cache Dinamis

1. **Konfigurasi Software SPI:**
   Menggunakan konstruktor bit-banging SPI Adafruit PN532 (`PIN_PN532_SCK`, `PIN_PN532_MISO`, `PIN_PN532_MOSI`, `PIN_PN532_SS`). Menjamin stabilitas transfer byte LSB_FIRST dan clocking tanpa konflik dengan bus VSPI hardware ESP32.
2. **Auto-Recovery SAMConfig:**
   Jika terjadi interferensi medan RF, driver memanggil `SAMConfig()` dan `setPassiveActivationRetries(0x01)` secara non-blocking agar modul selalu siap memindai kartu berikutnya.
3. **Whitelist Cache Dinamis:**
   Selain kartu default permanen (`04:A3:92:7F`), firmware secara berkala (tiap 60 detik) mengunduh daftar UID kartu aktif dari Supabase/Laravel. Kartu baru yang didaftarkan di Web Dashboard langsung aktif di alat fisik tanpa perlu flash ulang firmware.

---

## 🛠️ 6. Cara Kompilasi & Upload Firmware

### A. Menggunakan PlatformIO (Disarankan)
1. Buka folder `firmware/esp32` di VS Code / Terminal.
2. Kompilasi firmware:
   ```bash
   pio run -e hardware_irl
   ```
3. Upload ke ESP32 melalui kabel USB:
   ```bash
   pio run -e hardware_irl -t upload
   ```
4. Buka Serial Monitor:
   ```bash
   pio device monitor -b 115200
   ```

### B. Menggunakan Arduino IDE
1. Buka Arduino IDE.
2. Buka file `firmware/esp32/NFCKey_Hardware_IRL/NFCKey_Hardware_IRL.ino`.
3. Dari **Tools > Manage Libraries...**, pasang:
   * **`Adafruit PN532`** by Adafruit
   * **`MFRC522`** by GithubCommunity
4. Pilih board: **ESP32 Dev Module**.
5. Klik tombol **Upload** (Tanda Panah Kanan).
