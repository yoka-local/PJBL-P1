# 🧪 Panduan & Prosedur Pengujian Modul NFC / RFID (NFC Device Test Guide)

Dokumen ini memuat **skrip diagnostik mandiri** dan **matriks skenario pengujian** untuk memastikan modul pembaca NFC/RFID (RC522 / PN532) terhubung dengan benar, mampu membaca kartu/e-Money, serta berinteraksi secara tepat dengan indikator LED dan Buzzer sebelum dihubungkan ke sistem backend utama.

---

## 🛠️ Bagian 1: Skrip Diagnostik Mandiri (Standalone NFC Test Sketch)

Gunakan skrip di bawah ini untuk menguji perangkat keras NFC secara terisolasi. Skrip ini akan:
1. Memverifikasi komunikasi bus SPI antara ESP32 dan modul RC522.
2. Membaca versi firmware RC522 (mendeteksi jika kabel longgar/salah pin).
3. Membaca UID kartu yang ditempelkan, menampilkan tipe kartu (*PICC Type*), dan format UID ke Serial Monitor (115200 baud).
4. Menyalakan **LED Hijau + Bip Pendek** jika kartu terdaftar dalam whitelist contoh.
5. Menyalakan **LED Merah + Bip Panjang** jika kartu tidak terdaftar.

```cpp
/**
 * NFCKey - NFC / RFID Hardware Diagnostic Test
 * Baudrate: 115200
 */
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>

// Definisi Pin sesuai config.h
#define PIN_RFID_SS     5
#define PIN_RFID_RST    22
#define PIN_RFID_SCK    18
#define PIN_RFID_MISO   19
#define PIN_RFID_MOSI   23

#define PIN_LED_GREEN   32
#define PIN_LED_RED     33
#define PIN_BUZZER      14
#define PIN_DOOR_RELAY  26

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

// Contoh UID Kartu Terdaftar untuk Pengujian
const String ACCEPTED_UID_1 = "04:A3:92:7F";
const String ACCEPTED_UID_2 = "11:22:33:44";

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==============================================");
    Serial.println("     NFCKey: DIAGNOSTIK HARDWARE NFC/RFID     ");
    Serial.println("==============================================\n");

    // Inisialisasi Pin Indikator & Relay
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_DOOR_RELAY, OUTPUT);

    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    digitalWrite(PIN_DOOR_RELAY, LOW);

    // Inisialisasi SPI Bus
    Serial.print("[SPI] Memulai SPI Bus (SCK:18, MISO:19, MOSI:23, SS:5)... ");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    Serial.println("OK");

    // Inisialisasi RC522
    Serial.print("[RC522] Inisialisasi modul pembaca... ");
    mfrc522.PCD_Init();
    delay(50);
    Serial.println("OK");

    // Cek Versi Firmware RC522 untuk verifikasi sambungan kabel fisik
    byte v = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
    Serial.print("[RC522] Firmware Version Register: 0x");
    Serial.println(v, HEX);

    if (v == 0x00 || v == 0xFF) {
        Serial.println("❌ ERROR: Komunikasi dengan modul RC522 GAGAL!");
        Serial.println("   -> Periksa kabel SPI (VCC 3.3V, GND, SS=5, SCK=18, MOSI=23, MISO=19, RST=22).");
        Serial.println("   -> Pastikan modul mendapatkan daya 3.3V stabil (JANGAN gunakan 5V untuk VCC RC522!).");
        while (1) {
            digitalWrite(PIN_LED_RED, HIGH);
            delay(200);
            digitalWrite(PIN_LED_RED, LOW);
            delay(200);
        }
    } else if (v == 0x91 || v == 0x92) {
        Serial.println("✅ SUKSES: Modul RC522 terdeteksi normal (Version 1.0/2.0).");
    } else {
        Serial.println("⚠️ CATATAN: Terdeteksi versi clone / non-standar (0x" + String(v, HEX) + "), pengujian tetap dilanjutkan.");
    }

    // Bip pendek penanda alat siap
    tone(PIN_BUZZER, 2000, 100);
    Serial.println("\n[READY] Dekatkan kartu / e-Money / smart tag ke modul pembaca...\n");
}

void loop() {
    // 1. Deteksi keberadaan kartu baru
    if (!mfrc522.PICC_IsNewCardPresent()) {
        return;
    }

    // 2. Baca serial UID kartu
    if (!mfrc522.PICC_ReadCardSerial()) {
        return;
    }

    // 3. Konversi byte UID ke string heksadesimal berformat (contoh: 04:A3:92:7F)
    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
        uidString += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) uidString += ":";
    }
    uidString.toUpperCase();

    // 4. Baca tipe kartu
    MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
    String typeName = mfrc522.PICC_GetTypeName(piccType);

    Serial.println("----------------------------------------------");
    Serial.print("📡 Kartu Terdeteksi!");
    Serial.print(" | UID: ");
    Serial.print(uidString);
    Serial.print(" | Panjang UID: ");
    Serial.print(mfrc522.uid.size);
    Serial.print(" bytes | Tipe: ");
    Serial.println(typeName);

    // 5. Uji Otorisasi Sederhana
    if (uidString == ACCEPTED_UID_1 || uidString == ACCEPTED_UID_2) {
        Serial.println("🟢 STATUS: [AKSES DITERIMA] UID terdaftar di whitelist.");
        digitalWrite(PIN_LED_GREEN, HIGH);
        digitalWrite(PIN_DOOR_RELAY, HIGH); // Buka kunci solenoid
        tone(PIN_BUZZER, 2000, 150);        // 1 bip pendek sukses
        delay(1000);
        digitalWrite(PIN_LED_GREEN, LOW);
        digitalWrite(PIN_DOOR_RELAY, LOW);  // Kunci kembali
    } else {
        Serial.println("🔴 STATUS: [AKSES DITOLAK] Kartu tidak dikenal.");
        digitalWrite(PIN_LED_RED, HIGH);
        tone(PIN_BUZZER, 500, 400);         // 1 nada rendah error
        delay(600);
        digitalWrite(PIN_LED_RED, LOW);
    }

    // Hentikan komunikasi dengan kartu saat ini untuk debounce
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();

    delay(1000); // Debounce delay 1 detik sebelum pembacaan berikutnya
}
```

---

## 📋 Bagian 2: Matriks Skenario Pengujian (Test Checklist)

Lakukan 6 skenario pengujian berikut secara berurutan dan catat hasilnya:

| ID Uji | Nama Skenario | Langkah Pengujian | Indikator Keberhasilan (Expected Result) | Status |
|---|---|---|---|---|
| **NFC-01** | **Deteksi Hardware & SPI Handshake** | Nyalakan ESP32 dan buka Serial Monitor (115200 baud). Amati log boot. | Register Version menampilkan `0x91` atau `0x92`. Tidak muncul pesan error `0x00` atau `0xFF`. Buzzer berbunyi 1x bip singkat saat siap. | [ ] |
| **NFC-02** | **Pembacaan Kartu RFID 1K (4-Byte UID)** | Tempelkan kartu putih / blue keyfob bawaan RC522 ke antena. | Serial monitor mencetak UID 4-byte (misal: `12:34:56:78`), tipe kartu terbaca `Mifare Classic 1K`. | [ ] |
| **NFC-03** | **Pembacaan Kartu e-Money / NFC (7-Byte UID)** | Tempelkan kartu Mandiri e-Money / Flazz BCA / KTP elektronik. | Serial monitor membaca UID (7-byte atau 4-byte) tanpa freeze/crash. | [ ] |
| **NFC-04** | **Debounce & Tahan Kartu (Hold-on Test)** | Tempelkan kartu dan tahan di atas reader selama 5 detik tanpa diangkat. | Reader hanya memproses **1 kali tap**. Tidak terjadi pembacaan berulang-ulang (*spamming*) selama kartu ditahan. | [ ] |
| **NFC-05** | **Uji Validasi Akses Diterima vs Ditolak** | 1. Tap kartu yang UID-nya dicatat pada `ACCEPTED_UID_1`.<br>2. Tap kartu lain yang belum terdaftar. | • Kartu Terdaftar: LED Hijau menyala, relay terpicu (`HIGH`), buzzer bip pendek.<br>• Kartu Asing: LED Merah menyala, relay tetap `LOW`, buzzer bersuara nada panjang error. | [ ] |
| **NFC-06** | **Jarak Baca & Toleransi Penghalang (Distance Test)** | Uji pembacaan pada jarak 0 cm, 1 cm, 2 cm, dan melalui lapisan akrilik box 2 mm. | Kartu terbaca stabil pada jarak $\ge 1.5\text{ cm}$ dan tembus lapisan akrilik/plastik non-logam. | [ ] |

---

## ⚠️ Troubleshooting Umum Saat Pengujian

1. **Serial Monitor menampilkan `Version Register: 0x00` atau `0xFF`:**
   * **Penyebab:** Jalur SPI terputus, pin tertukar, atau modul kekurangan tegangan.
   * **Solusi:** Periksa kembali kabel jumper (khususnya **GPIO 5 untuk SDA/SS** dan **GPIO 22 untuk RST**). Pastikan VCC RC522 terhubung ke pin **3V3 ESP32** (bukan 5V!).
2. **Kartu tidak terdeteksi sama sekali (`PICC_IsNewCardPresent()` selalu false):**
   * **Penyebab:** Header pin modul RC522 belum disolder (hanya ditancapkan longgar).
   * **Solusi:** Header pin wajib disolder dengan timah agar kontak frekuensi radio 13.56 MHz tidak terdistorsi.
3. **Kartu e-Money sulit terbaca oleh RC522:**
   * **Penyebab:** RC522 dirancang spesifik untuk protokol ISO 14443A (Mifare Classic). Kartu e-Money perbankan modern menggunakan ISO 14443-4 (Desfire/JavaCard).
   * **Solusi:** Jika menggunakan PN532, ubah switch ke mode SPI/I2C. Jika menggunakan RC522, gunakan kartu RFID Mifare 1K standar atau tag NFC NTAG213/215.
