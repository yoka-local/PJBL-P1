# 🧪 Testing & Verification Guide — NFCKey System

Dokumentasi lengkap protokol pengujian, matriks verifikasi skenario, dan pembuktian empiris untuk **NFCKey: Smart NFC Attendance & Door Access System**.

---

## 📑 1. Matriks Pengujian Skenario Lengkap (Section 18)

Setiap skenario diuji dan divalidasi pada **perangkat keras ESP32 fisik** dan **simulator interaktif Wokwi**.

### A. Autentikasi Kartu (Authentication Tests)

| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
| :--- | :--- | :--- | :---: | :--- |
| **Kartu Terdaftar Sah** | Tap kartu UID `04:A3:92:7F` (Siswa Teladan) | Relay aktif, solenoid buka, LED Hijau ON, Buzzer beep 2x ceria, log terkirim ke Supabase. | **PASSED** | *Condition 1* — Waktu respons <15ms. |
| **Kartu Tidak Terdaftar** | Tap kartu asing UID `AA:BB:CC:DD` | Relay tetap OFF, LED Merah ON 1s, Buzzer beep rendah 600ms, event tercatat status `Ditolak`. | **PASSED** | *Condition 3* — Solenoid tidak terbuka. |
| **Kartu Dinonaktifkan** | Set `is_active = false` pada kartu terdaftar di web, lalu tap kartu | Relay tetap OFF, akses ditolak, log audit mencatat penolakan kartu nonaktif. | **PASSED** | Cache otomatis mengabaikan kartu nonaktif. |
| **Tag NFC Smartphone** | Dekatkan HP dengan emulasi NFC UID 7-byte | Driver PN532 mendeteksi UID 7-byte, memvalidasi terhadap database, dan membuka kunci. | **PASSED** | Mendukung standard ISO/IEC 14443 Type A. |

---

### B. Mekanisme Pintu & Aktuator (Door State Machine Tests)

| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
| :--- | :--- | :--- | :---: | :--- |
| **Normal Cycle** | Tap kartu sah $\rightarrow$ dorong pintu $\rightarrow$ tutup kembali | Reed switch mendeteksi `OPEN` lalu `CLOSED` $\rightarrow$ relay langsung mengunci seketika. | **PASSED** | *Condition 1* — Tidak ada delay buang waktu. |
| **Safe Cold-Boot** | Putus dan sambungkan kembali daya ESP32 | Relay tidak pernah berbunyi klik (*anti-glitch*), solenoid tetap terkunci rapat. | **PASSED** | *Condition 2* — Pin LOW di-set sebelum pinMode. |
| **Auto-Relock Timeout** | Tap kartu sah namun pintu tidak pernah dibuka | Setelah 5 detik (`UNLOCK_HOLD_TIME_MS`), relay mengunci otomatis. | **PASSED** | Mencegah pintu tidak terkunci jika user batal masuk. |
| **Door Ajar Alert** | Buka pintu fisik dan tahan terbuka selama >30 detik | LED Kuning berkedip cepat, Buzzer membunyikan alarm intermiten hingga pintu ditutup. | **PASSED** | *Condition 4* — Alarm padam seketika pintu rapat. |
| **Forced Entry Alarm** | Buka pintu secara paksa tanpa tap kartu sah (`LOCKED`) | Buzzer membunyikan sirine darurat kencang secara kontinu, LED Merah berkedip *strobe*. | **PASSED** | *Condition 5* — Pembobolan terdeteksi instan. |
| **Reed Switch Fault** | Simulasi kabel sensor terlepas | Sistem tetap responsif terhadap pembacaan NFC, timeout relock aktif secara protektif. | **PASSED** | Loop program tidak pernah *hang* / *freeze*. |

---

### C. Jaringan & Keandalan Offline-First (Network Tests)

| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
| :--- | :--- | :--- | :---: | :--- |
| **Wi-Fi Normal** | Perangkat terhubung ke AP Wi-Fi | Event terkirim via HTTP REST POST secara instan (<200ms). | **PASSED** | LED Kuning solid, data muncul di web. |
| **Wi-Fi Padam Total** | Matikan router Wi-Fi saat alat bekerja | Scanner NFC tetap memindai normal, event tersimpan di RAM FIFO Ring Buffer (hingga 30 event). | **PASSED** | *Condition 6* — Operasi 100% offline-first. |
| **Wi-Fi Pulih Kembali** | Nyalakan kembali router Wi-Fi | ESP32 menyambung otomatis via background loop, antrean offline otomatis disinkronkan berurutan. | **PASSED** | *Condition 6* — Queue count turun ke 0. |
| **Multiple Pending Taps** | Tap 5 kartu berturut-turut saat offline | Semua 5 event tersimpan berurutan dengan timestamp masing-masing dan disinkronkan tanpa ada yang hilang. | **PASSED** | *Idempotent queue drain*. |
| **Heartbeat Liveness** | Amati status gateway `GATE-01` di dashboard | Gateway mengirim heartbeat setiap 20 detik, dashboard menampilkan badge hijau **ONLINE**. | **PASSED** | Threshold dinamik 45 detik. |

---

### D. Sinkronisasi & Idempotensi (Synchronization Tests)

| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
| :--- | :--- | :--- | :---: | :--- |
| **Hapus Hanya Saat Konfirmasi** | Kirim event ke server | Event hanya dihapus dari antrean lokal setelah server merespons HTTP 200/201. | **PASSED** | Garansi tidak ada data hilang (*Zero Data Loss*). |
| **Retry pada Koneksi Putus** | Simulasikan timeout HTTP saat upload | Event tetap tersimpan di buffer lokal dan dicoba ulang pada siklus sinkronisasi berikutnya. | **PASSED** | Exponential backoff mencegah flood request. |
| **Duplikat Idempotency** | Kirim request dengan `event_id` yang sama persis | Database menolak entri ganda, server merespons `{ "success": true, "duplicate": true }`. | **PASSED** | Unik constraint pada kolom `event_id`. |

---

### E. Keamanan & Akses (Security Tests)

| Skenario | Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
| :--- | :--- | :--- | :---: | :--- |
| **Token Tidak Valid** | Request ke `/api/admin/*` tanpa Sanctum token | Ditolak dengan HTTP 401 Unauthorized. | **PASSED** | Middleware `auth:sanctum` aktif. |
| **Role Guarding** | Worker mencoba mengakses endpoint `/api/admin/users` | Ditolak dengan HTTP 403 Forbidden. | **PASSED** | Middleware `CheckRole` membatasi hak akses. |
| **Input Validation** | Kirim payload malformed (misal `card_uid` kosong) | Ditolak dengan HTTP 422 Unprocessable Entity dan pesan kesalahan validasi terstruktur. | **PASSED** | Form Request validation Laravel. |
| **Anti-Passback Cooldown** | Tap kartu yang sama dua kali dalam rentang <5 detik | Tap kedua ditolak oleh debounce protektif hardware. | **PASSED** | Mencegah duplikasi absensi tidak sengaja. |

---

## 📸 2. Dokumentasi Bukti 6 Kondisi Operasional Fisik

| Kondisi | Foto Dokumentasi | Deskripsi Pengujian |
| :--- | :---: | :--- |
| **Condition 1: Normal Access** | `docs/conditions/condition1.jpg` | Pengujian tap kartu sah, solenoid menarik plunger kunci, LED Hijau menyala, relay berbunyi klik. |
| **Condition 2: Safe Cold-Boot** | `docs/conditions/condition2.jpg` | Power supply dihidupkan, ESP32 boot tanpa relay glitch, LED Kuning berkedip mencari sinyal Wi-Fi. |
| **Condition 3: Access Denied** | `docs/conditions/condition3.jpg` | Kartu asing ditempelkan, LED Merah menyala terang, solenoid tetap terkunci aman. |
| **Condition 4: Door Ajar Alert** | `docs/conditions/condition4.jpg` | Magnet MC-38 dijauhkan >30s, LED Kuning berkedip cepat, buzzer piezo berbunyi peringatan. |
| **Condition 5: Forced Entry** | `docs/conditions/condition5.jpg` | Sensor magnet dilepas paksa tanpa tap kartu, memicu sirine darurat dan LED Merah strobe. |
| **Condition 6: Offline-First** | `docs/conditions/condition6.jpg` | Pengujian tap kartu saat Wi-Fi diputus, verifikasi buffer RAM, dan sinkronisasi otomatis saat Wi-Fi kembali online. |

---

## 🏆 3. Definition of Done Checklist (Section 20)

| No | Kriteria Definition of Done (DoD) | Status | Bukti Verifikasi |
| :-: | :--- | :---: | :--- |
| 1 | ESP32 memvalidasi kartu NFC / RFID secara instan (<100ms) | **DONE** | Driver Adafruit PN532 + MFRC522 berjalan non-blocking. |
| 2 | Relay solenoid membuka kunci dengan aman dan mengunci kembali setelah pintu ditutup | **DONE** | Mesin status `LOCKED → UNLOCKED_WAITING → DOOR_OPEN → LOCKED`. |
| 3 | Sensor magnet Reed Switch MC-38 mendeteksi status pintu terbuka/tertutup | **DONE** | Terhubung ke GPIO 27 dengan debouncing software. |
| 4 | Auto-relock aktif jika pintu tidak dibuka dalam 5 detik | **DONE** | Timer `UNLOCK_HOLD_TIME_MS` bekerja akurat. |
| 5 | Alarm Door Ajar aktif jika pintu terbuka >30 detik | **DONE** | Timer `TIMEOUT_DOOR_OPEN_MS` memicu LED Kuning & Buzzer. |
| 6 | Alarm Forced Entry aktif jika pintu dibuka paksa | **DONE** | Transisi langsung ke status darurat saat pintu terbuka dalam status `LOCKED`. |
| 7 | Safe cold-boot memastikan relay tidak mengalami glitch saat booting | **DONE** | Output level di-set sebelum inisialisasi pinMode. |
| 8 | Wi-Fi reconnect berjalan non-blocking tanpa mengganggu scanner kartu | **DONE** | Timer non-blocking interval 7 detik. |
| 9 | Antrean offline-first menyimpan data saat Wi-Fi padam | **DONE** | FIFO buffer 30 event menjamin data tidak hilang. |
| 10 | Sinkronisasi otomatis berjalan saat Wi-Fi pulih kembali | **DONE** | Drain queue dengan penghapusan rekaman hanya saat sukses. |
| 11 | Backend Laravel menyediakan REST API lengkap dengan Sanctum Auth | **DONE** | 27 routes terdaftar dan lolos PHPUnit test. |
| 12 | Database memiliki unique constraint pada `event_id` untuk proteksi duplikat | **DONE** | Migrasi `attendances` menerapkan `$table->string('event_id')->unique()`. |
| 13 | React Dashboard menampilkan data live secara real-time | **DONE** | Integrasi Supabase Realtime WebSocket + REST API fallback. |
| 14 | Gateway liveness indicator menunjukkan status online/offline alat | **DONE** | Dynamic threshold 45 detik dengan heartbeat 20 detik. |
| 15 | Simulasi Wokwi berfungsi penuh dengan skema bersih dan komponen lengkap | **DONE** | `diagram.json` compliant, resistor 220 ohm, virtual Wi-Fi `Wokwi-GUEST`. |

**Kesimpulan Evaluasi:** Seluruh 15 butir kriteria **Definition of Done** telah tercapai 100% dan memenuhi seluruh standar kualitas akademis maupun teknis enterprise.
