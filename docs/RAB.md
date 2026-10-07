# Rencana Anggaran Biaya (RAB) - NFCKey

Berikut adalah estimasi Rencana Anggaran Biaya (RAB) untuk pembuatan prototipe *smart door* NFCKey. Komponen difokuskan pada penggunaan teknologi NFC sebagai prioritas utama dengan pengunci *Solenoid 12V* untuk performa yang lebih kuat dan stabil.

| No | Nama Komponen | Spesifikasi / Keterangan | Estimasi Harga (Rp) | Check List |
|---|---|---|---|---|
| 1 | ESP32 Development Board | NodeMCU WROOM-32 (Disediakan oleh sekolah) | 45.000 - 50.000 | [x] |
| 2 | Modul NFC RFID PN532 V3 | Membaca kartu NFC (e-Money, smart tag) & RFID | 55.000 - 65.000 | [ ] | 
| 3 | Mini Solenoid Door Lock | **Versi 12V** (Lebih kuat dan stabil) | 35.000 - 45.000 | [ ] |
| 4 | Adaptor 12V 2A | Catu daya utama untuk Solenoid 12V | 25.000 - 35.000 | [ ] |
| 5 | Step-Down Module LM2596 | Menurunkan 12V ke 5V untuk power ESP32 (Satu colokan) | 12.000 - 15.000 | [ ] |
| 6 | Relay Module 1 Channel | 5V DC (Untuk mengontrol arus 12V ke solenoid) | 6.000 - 8.000 | [ ] |
| 7 | Jack DC Female 5.5x2.1mm | Soket untuk mencolok adaptor 12V ke rangkaian | 2.000 - 3.000 | [ ] |
| 8 | Magnetic Reed Switch (MC-38) | Sensor magnet pendeteksi status pintu (Buka/Tutup)| 8.000 - 12.000 | [ ] |
| 9 | Active Buzzer | 5V DC (Indikator audio/alarm) | 2.000 - 3.000 | [ ] |
| 10 | Kabel Jumper (Dupont) | 1 Set Female-Female & Male-Female (20/40 pcs) | 10.000 - 15.000 | [x] |
| 11 | Breadboard Half-Size | 400 Lubang (Untuk merangkai tanpa solder) | 10.000 - 15.000 | [x] | 
| 12 | Komponen Pasif | LED (Merah & Hijau) + Resistor (220 Ohm) secukupnya| 3.000 - 5.000 | [ ] |
| 13 | Dioda 1N4007 | Flyback diode pelindung rangkaian dari tegangan balik solenoid | 1.000 - 2.000 | [ ] |

### 🧮 Total Estimasi Biaya (Setup 12V)
**Rp 214.000 — Rp 273.000**
*(Dikarenakan ESP32 disediakan oleh sekolah, pengeluaran aktual yang dibutuhkan hanya sekitar **Rp 169.000 — Rp 223.000**)*

*Catatan: Harga dapat bervariasi bergantung pada toko di marketplace online. Dengan menggunakan Step-Down LM2596, Anda hanya memerlukan **satu Adaptor 12V** untuk memberi daya pada Solenoid (12V) dan ESP32 (5V) secara bersamaan, membuat sistem jauh lebih rapi dan profesional.*
