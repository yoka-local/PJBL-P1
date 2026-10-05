# Proposal Project Based Learning (PJBL)

## Identitas Proyek
- **Nama Kelompok:** Medan
- **Judul Program:** NexusGate: Sistem Akses Pintu Cerdas dan Presensi Terintegrasi Berbasis NFC dan IoT

**Anggota Kelompok:**
1. Mahardika Putra (0096724081)
2. Quinn Felicia Ghani Azalia (0109739201)
3. Mentari Puja Carisha (3093931629)
4. Maritza Cordelia Ardani (0102133417)
5. Ragnal Averroes A.R (0092383418)
6. Muhammad Haidar Bima Aqil (0093458496)
7. Rafa Lazuardi Alyamsah (0106276183)

---

## 1. Latar Belakang Masalah
Sistem presensi dan keamanan pintu tradisional saat ini sering kali masih mengandalkan kunci fisik dan pencatatan manual. Sistem manual rentan terhadap manipulasi (seperti "titip absen"), kehilangan data, serta hilangnya kunci yang dapat mengancam keamanan ruangan. Selain itu, manajemen data kehadiran yang terpisah dari sistem keamanan akses pintu membuat pemantauan operasional menjadi kurang efisien.

Dengan perkembangan teknologi *Internet of Things* (IoT) dan meluasnya penggunaan kartu pintar berteknologi *Near Field Communication* (NFC) (misalnya e-Money, kartu pelajar pintar), sistem akses dan presensi dapat digabungkan menjadi satu kesatuan. Diperlukan sebuah sistem terintegrasi yang mampu membaca identitas dari kartu NFC, membuka kunci pintu secara otomatis, sekaligus merekam waktu kehadiran langsung ke dalam basis data terpusat, bahkan dilengkapi fitur penyimpanan *offline* apabila jaringan internet sedang terputus.

## 2. Judul Program
*Saran Judul Utama:*
**NexusGate: Sistem Akses Pintu Cerdas dan Presensi Terintegrasi Berbasis NFC dan IoT**

*Alternatif Judul:*
1. **NexusGate:** Prototipe Sistem Keamanan Pintu dan Pencatatan Kehadiran Otomatis
2. **NexusGate:** Smart NFC Attendance & Door Access System

## 3. Jadwal Pelaksanaan
- **Jadwal Pengerjaan:** Oktober - November
- **Jadwal Monitoring:** Progress check dengan Bu Reny (minimal 3x pertemuan)
- **Jadwal Pengujian Hasil:** Minggu ke-2 November

## 4. Rancangan Prototype
**NexusGate** adalah sistem gerbang pintar (*smart door*) berbasis mikrokontroler ESP32. Alur kerja sistem dirancang sebagai berikut:
1. **Input Identitas:** Pengguna menempelkan kartu NFC/RFID pada modul pembaca (PN532/RC522).
2. **Validasi & Eksekusi:** ESP32 memvalidasi ID kartu. Jika kartu terdaftar, ESP32 akan memicu relay untuk membuka *Solenoid Door Lock* (pintu terbuka).
3. **Pencatatan Offline & Online:** Sistem mencatat data presensi (waktu dan ID) ke memori lokal ESP32, lalu mengirimkannya ke server backend (Laravel) melalui jaringan Wi-Fi untuk disimpan secara permanen.
4. **Monitoring Pintu:** Sensor magnetik (*Reed Switch*) akan membaca apakah pintu sudah kembali ditutup. Jika pintu dibiarkan terbuka terlalu lama dari batas waktu (misal >30 detik), sistem akan menyalakan *Active Buzzer* sebagai alarm peringatan.
5. **Dashboard Web:** Data presensi dan log akses pintu dapat dipantau *real-time* oleh admin melalui antarmuka website yang dibangun menggunakan React.

## 5. Alat & Bahan
**Perangkat Keras (Hardware):**
1. Mikrokontroler ESP32 (NodeMCU WROOM-32)
2. Modul NFC/RFID Reader (PN532 V3 / RC522)
3. Mini Solenoid Door Lock (5V)
4. Modul Relay 1 Channel (5V DC)
5. Sensor Magnetik / Magnetic Reed Switch (MC-38)
6. Active Buzzer (5V DC)
7. Kabel Jumper (Dupont Female-Female & Male-Female)
8. Breadboard (Half-Size)
9. Komponen Pasif (LED Merah & Hijau, Resistor 220 Ohm)
10. Sumber Daya (Adaptor/Charger HP 5V 2A & Kabel USB)

**Perangkat Lunak (Software):**
1. PlatformIO / Arduino IDE (C++ untuk Firmware ESP32)
2. Laravel (PHP untuk Web Backend API)
3. React dengan TypeScript & Tailwind CSS (Untuk Frontend Dashboard)
4. MySQL / SQLite (Sistem Basis Data)

## 6. Kebutuhan Biaya & Cara Pemenuhan
Berdasarkan Rencana Anggaran Biaya (RAB) yang telah dirancang:
- **Kebutuhan Biaya:** Total estimasi biaya pengadaan komponen berkisar antara **Rp 169.000 — Rp 208.000**. Mengingat komponen utama (ESP32) akan disediakan dari sekolah (menghemat ~Rp 50.000), maka dana tunai riil yang perlu disiapkan hanya sekitar **Rp 124.000 — Rp 158.000**. 
- **Cara Pemenuhan:** Dana proyek akan dipenuhi menggunakan sistem **iuran bersama (patungan)** anggota kelompok. Dengan jumlah anggota 7 orang, iuran per orang diperkirakan hanya sebesar **Rp 20.000 — Rp 25.000**.

## 7. Referensi
1. **Espressif Systems. (2023).** *ESP32 Documentation*. Diakses dari: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/
2. **Random Nerd Tutorials. (2022).** *Security Access using MFRC522 RFID Reader with Arduino*. Diakses dari: https://randomnerdtutorials.com/security-access-using-mfrc522-rfid-reader-with-arduino/
3. **Laravel Documentation. (2024).** *Laravel - The PHP Framework for Web Artisans*. Diakses dari: https://laravel.com/docs
4. **React Documentation. (2024).** *React – A JavaScript library for building user interfaces*. Diakses dari: https://react.dev/
