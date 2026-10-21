/**
 * ============================================================================
 * MODUL: NetworkModule (Koneksi WiFi, Offline Queue, & Supabase Database Sync)
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
static unsigned long lastHeartbeat = 0;
static bool wifiConnectedBefore = false;

// ============================================================================
// OFFLINE QUEUE BUFFER (RAM)
// ============================================================================
void queue_push(const AttendanceEvent& event) {
    if (queueCount < QUEUE_MAX) {
        queueBuffer[queueCount++] = event;
        Serial.printf("[QUEUE] Event %s tersimpan di antrean RAM (%d/%d pending)\n", 
                      event.event_id.c_str(), queueCount, QUEUE_MAX);
    } else {
        Serial.println("[QUEUE] ⚠️ Antrean penuh! Data tertua akan dipertahankan.");
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
// WI-FI CONNECTION MANAGER
// ============================================================================
bool wifi_is_connected() {
    return (WiFi.status() == WL_CONNECTED);
}

void wifi_init() {
    Serial.printf("[WIFI] Mencoba menghubungkan ke Wi-Fi: '%s'...\n", WIFI_SSID);
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
            Serial.printf("[WIFI] ✅ TERHUBUNG KE WI-FI!\n");
            Serial.printf("[WIFI] IP Address : %s\n", WiFi.localIP().toString().c_str());
            Serial.printf("[WIFI] Signal RSSI: %d dBm\n", WiFi.RSSI());
            Serial.println("[WIFI] ==============================================\n");
            wifiConnectedBefore = true;
            led_yellow_set(true); // LED Kuning ON solid menandakan Wi-Fi siap
        }
    } else {
        if (wifiConnectedBefore) {
            Serial.println("[WIFI] ⚠️ Koneksi Wi-Fi terputus! Mencoba menyambung kembali...");
            wifiConnectedBefore = false;
        }
        led_yellow_blink(); // LED Kuning berkedip saat sedang mencoba koneksi

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

    Serial.printf("[SYNC] Mengunggah event %s (%s - %s) ke Database Supabase...\n", 
                  event.event_id.c_str(), event.card_uid.c_str(), event.status.c_str());

    HTTPClient http;
    http.begin(API_URL);
    http.setTimeout(3500); // Batas timeout 3.5 detik agar loop RFID & pintu tidak freeze
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
            Serial.printf("[SYNC] ✅ BERHASIL! Supabase mencatat event absensi (HTTP %d).\n", httpCode);
            queue_remove();
        } else {
            String resp = http.getString();
            Serial.printf("[SYNC] ⚠️ Supabase merespons HTTP %d: %s\n", httpCode, resp.c_str());
            if (httpCode >= 400 && httpCode < 500) {
                // Drop error client jika ada anomali agar tidak menyumbat antrean
                queue_remove();
            }
        }
    } else {
        Serial.printf("[SYNC] ❌ Gagal HTTP POST: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}

// ============================================================================
// HEARTBEAT PING (Membuat status gateway di Website Dashboard 'Online' Real-time)
// ============================================================================
void heartbeat_update() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (millis() - lastHeartbeat < HEARTBEAT_TIME_MS && lastHeartbeat != 0) return;

    lastHeartbeat = millis();

    HTTPClient http;
    String url = String(SUPABASE_URL) + "/rest/v1/devices?device_id=eq." + String(DEVICE_ID);
    http.begin(url);
    http.setTimeout(3500);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);

    int httpCode = http.sendRequest("PATCH", "{\"status\":\"online\"}");
    if (httpCode > 0) {
        Serial.printf("[HEARTBEAT] ❤️ Ping status online GATE-01 terkirim ke Supabase (HTTP %d)\n", httpCode);
    } else {
        Serial.printf("[HEARTBEAT] Ping gagal: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
}
