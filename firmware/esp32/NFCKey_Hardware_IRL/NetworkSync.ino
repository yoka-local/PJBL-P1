/**
 * ============================================================================
 * MODUL: NetworkSync (Koneksi WiFi, Offline Queue, & Supabase Cloud Sync)
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "Config.h"

#define QUEUE_MAX 20
static AttendanceEvent queueBuffer[QUEUE_MAX];
static int queueCount = 0;

static unsigned long lastWiFiAttempt = 0;
static unsigned long lastSyncAttempt = 0;
static bool wifiConnectedBefore = false;

// ============================================================================
// OFFLINE QUEUE BUFFER (RAM)
// ============================================================================
void queue_push(const AttendanceEvent& event) {
    if (queueCount < QUEUE_MAX) {
        queueBuffer[queueCount++] = event;
        Serial.printf("[QUEUE] Event %s tersimpan (%d/%d pending)\n", event.event_id.c_str(), queueCount, QUEUE_MAX);
    } else {
        Serial.println("[QUEUE] Antrean penuh!");
    }
}

bool queue_peek(AttendanceEvent& event) {
    if (queueCount > 0) {
        event = queueBuffer[0];
        return true;
    }
    return false;
}

void queue_remove() {
    if (queueCount > 0) {
        for (int i = 0; i < queueCount - 1; i++) {
            queueBuffer[i] = queueBuffer[i + 1];
        }
        queueCount--;
    }
}

// ============================================================================
// WI-FI MANAGER
// ============================================================================
void wifi_init() {
    Serial.printf("[WIFI] Menghubungkan ke Wi-Fi: '%s'...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWiFiAttempt = millis();
}

void wifi_update() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!wifiConnectedBefore) {
            Serial.printf("[WIFI] Terhubung! IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
            wifiConnectedBefore = true;
        }
    } else {
        if (wifiConnectedBefore) {
            Serial.println("[WIFI] Koneksi terputus. Mencoba rekoneksi...");
            wifiConnectedBefore = false;
        }
        if (millis() - lastWiFiAttempt >= 7000) {
            WiFi.reconnect();
            lastWiFiAttempt = millis();
        }
    }
}

// ============================================================================
// SUPABASE REST API BACKGROUND SYNC
// ============================================================================
void sync_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (queueCount == 0) return;
    if (millis() - lastSyncAttempt < 2000) return;

    lastSyncAttempt = millis();

    AttendanceEvent event;
    if (!queue_peek(event)) return;

    Serial.printf("[SYNC] Mengunggah event %s (%s) ke Supabase...\n", event.event_id.c_str(), event.card_uid.c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(3500); // Mencegah freeze pada RFID dan pintu jika internet lambat
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Prefer", "return=minimal");

    String requestBody = "{\"event_id\":\"" + event.event_id + 
                         "\",\"card_uid\":\"" + event.card_uid + 
                         "\",\"device_id\":\"" + event.device_id + 
                         "\",\"status\":\"" + event.status + "\"}";

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
        if (httpResponseCode == 200 || httpResponseCode == 201 || httpResponseCode == 204) {
            Serial.printf("[SYNC] BERHASIL! Supabase mencatat event (HTTP %d).\n", httpResponseCode);
            queue_remove();
        } else {
            String responseText = http.getString();
            Serial.printf("[SYNC] Supabase merespons HTTP %d: %s\n", httpResponseCode, responseText.c_str());
            if (httpResponseCode >= 400 && httpResponseCode < 500) {
                // Drop jika error 4xx agar tidak menyumbat antrean
                queue_remove();
            }
        }
    } else {
        Serial.printf("[SYNC] Gagal HTTP POST: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

// ============================================================================
// HEARTBEAT PING (Kirim status aktif berkala ke Supabase agar Dashboard Realtime)
// ============================================================================
static unsigned long lastHeartbeat = 0;

void heartbeat_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (millis() - lastHeartbeat < 20000 && lastHeartbeat != 0) return;

    lastHeartbeat = millis();

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/devices?device_id=eq." + String(DEVICE_ID);
    http.begin(url);
    http.setTimeout(3500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    int httpResponseCode = http.sendRequest("PATCH", "{\"status\":\"online\"}");
    if (httpResponseCode > 0) {
        Serial.printf("[HEARTBEAT] Ping Supabase Aktif (HTTP %d)\n", httpResponseCode);
    } else {
        Serial.printf("[HEARTBEAT] Ping Gagal: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
}
