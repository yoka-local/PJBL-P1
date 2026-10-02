#include <SPI.h>
#include <MFRC522.h>
#include "config.h"
#include "rfid_reader.h"

MFRC522 mfrc522(PIN_RFID_SS, PIN_RFID_RST);

static unsigned long lastReadTime = 0;
static String lastReadUid = "";
const unsigned long DEBOUNCE_DELAY_MS = 2000; // 2 seconds debounce

void rfid_init() {
    LOG_RFID("Initializing SPI and RC522...");
    SPI.begin(PIN_RFID_SCK, PIN_RFID_MISO, PIN_RFID_MOSI, PIN_RFID_SS);
    mfrc522.PCD_Init();
    delay(50);
    mfrc522.PCD_DumpVersionToSerial();
    LOG_RFID("RC522 Initialized.");
}

String rfid_update() {
    // Look for new cards
    if (!mfrc522.PICC_IsNewCardPresent()) {
        return "";
    }
    // Select one of the cards
    if (!mfrc522.PICC_ReadCardSerial()) {
        return "";
    }

    String uidString = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
        uidString += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) uidString += ":";
    }
    uidString.toUpperCase();

    // Halt PICC to stop reading the same card repeatedly in a tight loop
    mfrc522.PICC_HaltA();
    
    // Debounce
    if (uidString == lastReadUid && (millis() - lastReadTime) < DEBOUNCE_DELAY_MS) {
        return "";
    }

    lastReadUid = uidString;
    lastReadTime = millis();

    LOG_RFID(("Card detected: " + uidString).c_str());
    return uidString;
}

bool rfid_is_card_valid(const String& uid) {
    // Phase 2 stub: hardcoded accepted cards. 
    // In Phase 5, this will check the local offline cache stored in SPIFFS
    if (uid == "04:A3:92:7F" || uid == "DE:AD:BE:EF") {
        return true;
    }
    return false;
}
