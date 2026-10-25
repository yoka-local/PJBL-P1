/**
 * ============================================================================
 * MODUL: NetworkModule.ino
 * Tanggung Jawab: Koneksi Wi-Fi Non-blocking, Antrean Offline (Offline-First),
 *                 Sinkronisasi Presensi Supabase, Live Heartbeat, & Card Whitelist Sync
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "Config.h"

// Antrean Penyimpanan Offline (RAM Ring Buffer)
#define QUEUE_MAX 30
static AttendanceEvent queueBuffer[QUEUE_MAX];
static int queueCount = 0;

static unsigned long lastWiFiAttempt = 0;
static unsigned long lastSyncAttempt = 0;
static unsigned long lastHeartbeat = 0;
static unsigned long lastCardSync = 0;
static bool wifiConnectedBefore = false;

// ============================================================================
// ANTREAN OFFLINE-FIRST (OFFLINE QUEUE)
// ============================================================================
void queue_push(const AttendanceEvent& event) {
    if (queueCount < QUEUE_MAX) {
        queueBuffer[queueCount++] = event;
        Serial.printf("[QUEUE] 📥 Event %s disimpan ke antrean offline (%d/%d pending)\n", 
                      event.event_id.c_str(), queueCount, QUEUE_MAX);
    } else {
        Serial.println("[QUEUE] ⚠️ Antrean penuh! Menggeser rekaman tertua.");
        for (int i = 0; i < QUEUE_MAX - 1; i++) {
            queueBuffer[i] = queueBuffer[i + 1];
        }
        queueBuffer[QUEUE_MAX - 1] = event;
    }
}

static bool queue_peek(AttendanceEvent& event) {
    if (queueCount > 0) {
        event = queueBuffer[0];
        return true;
    }
    return false;
}

static void queue_remove() {
    if (queueCount > 0) {
        for (int i = 0; i < queueCount - 1; i++) {
            queueBuffer[i] = queueBuffer[i + 1];
        }
        queueCount--;
    }
}

// ============================================================================
// MANAJER KONEKSI WI-FI (NON-BLOCKING)
// ============================================================================
bool wifi_is_connected() {
    return (WiFi.status() == WL_CONNECTED);
}

void wifi_init() {
    Serial.printf("[WIFI] Memulai koneksi ke Wi-Fi: '%s'...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWiFiAttempt = millis();
}

void wifi_update() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnectedBefore) {
            Serial.println("\n[WIFI] ==============================================");
            Serial.println("[WIFI] ✅ SUKSES TERHUBUNG KE JARINGAN WI-FI!");
            Serial.printf("[WIFI] SSID        : %s\n", WiFi.SSID().c_str());
            Serial.printf("[WIFI] IP Address  : %s\n", WiFi.localIP().toString().c_str());
            Serial.printf("[WIFI] Signal RSSI : %d dBm\n", WiFi.RSSI());
            Serial.println("[WIFI] ==============================================\n");
            wifiConnectedBefore = true;
            led_yellow_set(true); // LED Kuning ON solid = Wi-Fi siap

            // Beri jeda bertahap agar loop utama dan scanner NFC tidak terblokir
            lastSyncAttempt = millis() + 2000;   // Sinkronisasi antrean setelah 2 detik
            lastHeartbeat   = millis() + 6000;   // Heartbeat pertama setelah 6 detik
            lastCardSync    = millis() + 15000;  // Download kartu baru setelah 15 detik

            Serial.println("[NFC] 📡 Wi-Fi terhubung! Scanner PN532 aktif & siap memindai kartu...");
        }
    } else {
        if (wifiConnectedBefore) {
            Serial.println("[WIFI] ⚠️ Koneksi Wi-Fi terputus! Mode Offline-First diaktifkan.");
            wifiConnectedBefore = false;
        }
        led_yellow_blink(); // LED Kuning kedip = mencoba menyambung

        if (millis() - lastWiFiAttempt >= 7000) {
            WiFi.reconnect();
            lastWiFiAttempt = millis();
        }
    }
}

// ============================================================================
// SINKRONISASI LOG PRESENSI KE SUPABASE REST API
// ============================================================================
void sync_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (door_get_state() != DoorState::LOCKED) return; // Prioritaskan alur fisik pintu
    if (queueCount == 0) return;
    if (millis() - lastSyncAttempt < 2000) return;

    lastSyncAttempt = millis();

    AttendanceEvent event;
    if (!queue_peek(event)) return;

    Serial.printf("[SYNC] Mengunggah event %s (%s - %s) ke Supabase...\n", 
                  event.event_id.c_str(), event.card_uid.c_str(), event.status.c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(2500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    String requestBody = "{\"event_id\":\"" + event.event_id + 
                         "\",\"card_uid\":\"" + event.card_uid + 
                         "\",\"device_id\":\"" + event.device_id + 
                         "\",\"status\":\"" + event.status + "\"}";

    int httpCode = http.POST(requestBody);

    if (httpCode > 0) {
        if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
            Serial.printf("[SYNC] ✅ SUKSES! Supabase mencatat log absensi (HTTP %d). Sisa antrean: %d\n", 
                          httpCode, queueCount - 1);
            queue_remove();
        } else if (httpCode == 409) {
            // Idempotency: Event ID sudah ada di server (duplikasi dicegah)
            Serial.println("[SYNC] ℹ️ Event sudah ada di server (Duplicate Protection). Menghapus dari antrean.");
            queue_remove();
        } else {
            String resp = http.getString();
            Serial.printf("[SYNC] ⚠️ Respon server HTTP %d: %s\n", httpCode, resp.c_str());
            if (httpCode >= 400 && httpCode < 500) {
                // Hapus payload anomali klien agar tidak memblokir antrean
                queue_remove();
            }
        }
    } else {
        Serial.printf("[SYNC] ❌ Gagal HTTP POST: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}

// ============================================================================
// LIVE HEARTBEAT PING (Status Perangkat 'Online' di Dashboard Real-Time)
// ============================================================================
void heartbeat_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (door_get_state() != DoorState::LOCKED) return;
    if (millis() - lastHeartbeat < HEARTBEAT_TIME_MS && lastHeartbeat != 0) return;

    lastHeartbeat = millis();

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/devices?device_id=eq." + String(DEVICE_ID);
    http.begin(url);
    http.setTimeout(2500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    int httpCode = http.sendRequest("PATCH", "{\"status\":\"online\"}");
    if (httpCode > 0) {
        if (httpCode == 200 || httpCode == 204) {
            Serial.printf("[HEARTBEAT] ❤️ Ping status online GATE-01 terkirim ke Supabase (HTTP %d)\n", httpCode);
        }
    }
    http.end();
}

// ============================================================================
// DYNAMIC SYNC KARTU BARU DARI DATABASE SUPABASE
// ============================================================================
// Mengunduh UID kartu aktif dari tabel 'cards' agar kartu baru langsung dikenali
void card_sync_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (door_get_state() != DoorState::LOCKED) return;
    if (millis() - lastCardSync < CARD_SYNC_INTERVAL_MS && lastCardSync != 0) return;

    lastCardSync = millis();

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/cards?is_active=eq.true&select=uid";
    http.begin(url);
    http.setTimeout(2500);
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    int httpCode = http.GET();
    if (httpCode == 200) {
        String payload = http.getString();
        // Parsing UID sederhana dari JSON string tanpa library berat
        int idx = 0;
        while ((idx = payload.indexOf("\"uid\":\"", idx)) != -1) {
            idx += 7;
            int endQuote = payload.indexOf("\"", idx);
            if (endQuote != -1) {
                String fetchedUid = payload.substring(idx, endQuote);
                fetchedUid.toUpperCase();
                nfc_add_cached_card(fetchedUid);
                idx = endQuote + 1;
            } else {
                break;
            }
        }
    }
    http.end();
}
