# 🔌 Panduan Integrasi Perangkat ESP32 dengan IoT Gateway (HTTP, MQTT, & CoAP)

Dokumen ini menyediakan panduan langkah demi langkah dan kode program lengkap (Arduino C++) untuk menghubungkan **Perangkat ESP32** ke platform **Telecom Infra Project IoT Gateway** menggunakan tiga protokol jaringan: **HTTP REST API**, **MQTT Broker**, dan **CoAP UDP**.

---

## 📐 Arsitektur Konektivitas IoT Gateway

```
+-------------------+        HTTP POST (Port 3000)        +--------------------+
|                   | ----------------------------------> |                    |
|   Perangkat ESP32 |        MQTT Publish (Port 1884)     |   IoT Gateway      | ---> Backend API ---> DB/Dashboard
| (Sensor Temp/Hum) | ----------------------------------> | (http, mqtt, coap) |
|                   |        CoAP POST (Port 5683)        |                    |
|                   | ----------------------------------> |                    |
+-------------------+                                     +--------------------+
```

---

## 🛠️ Prasyarat & Penyiapan Lingkungan Development

### 1. Perangkat Keras (Hardware)
* Board **ESP32** (NodeMCU-32S, ESP32 WROOM-32, dll.)
* Sensor Opsional (misal DHT11/DHT22, BME280) atau data simulasi sensor
* Kabel Micro-USB / USB-C data cable

### 2. Perangkat Lunak (Software & Libraries)
* **Arduino IDE** (versi 1.8.x atau 2.x)
* **ESP32 Board Manager**: URL `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
* **Library Wajib** (Instal melalui *Library Manager* di Arduino IDE):
  * `ArduinoJson` (v6.x atau v7.x oleh Benoit Blanchon) — *Untuk serialisasi JSON*
  * `PubSubClient` (oleh Nick O'Leary) — *Khusus untuk protokol MQTT*
  * `coap-simple` (oleh Hirotaka Ster) — *Khusus untuk protokol CoAP UDP*
  * `WiFi.h`, `WiFiUdp.h`, & `HTTPClient.h` — *Sudah bawaan dari Core ESP32*

---

## 🔑 Spesifikasi Protokol & Authentication Schema

| Parameter | Model HTTP | Model MQTT | Model CoAP |
| :--- | :--- | :--- | :--- |
| **Port Default** | `3000` | `1884` | `5683 (UDP)` |
| **Endpoint / Topic** | `POST /api/v1/telemetry` | `telemetry/data` | `POST /telemetry` |
| **Header Autentikasi** | `x-api-key: <API_KEY_DEVICE>` | - | `authorization: <API_KEY_DEVICE>` |
| **MQTT Password** | - | `<API_KEY_DEVICE>` | - |
| **Content-Type** | `application/json` | String JSON | String JSON |
| **Format Payload** | `{"device_id":"...", "temperature":27.5, "humidity":65.0}` | `{"device_id":"...", "temperature":27.5, "humidity":65.0}` | `{"device_id":"...", "temperature":27.5, "humidity":65.0}` |

---

## 🚀 Model 1: Integrasi ESP32 Menggunakan HTTP REST API

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "Nama_WiFi_Anda";
const char* WIFI_PASSWORD = "Password_WiFi_Anda";
const char* GATEWAY_IP   = "192.168.1.100";
const int   GATEWAY_PORT = 3000;

const char* DEVICE_ID = "esp32-sensor-01";
const char* API_KEY   = "dev-secret-key-123";

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Terhubung! IP: " + WiFi.localIP().toString());
}

void loop() {
  static unsigned long lastSend = 0;
  if (millis() - lastSend >= 5000) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) sendHttpTelemetry();
  }
}

void sendHttpTelemetry() {
  HTTPClient http;
  String url = "http://" + String(GATEWAY_IP) + ":" + String(GATEWAY_PORT) + "/api/v1/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  StaticJsonDocument<200> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = 25.0 + random(0, 100) / 10.0;
  doc["humidity"]    = 60.0 + random(0, 200) / 10.0;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  Serial.printf("[HTTP] Status: %d | Payload: %s\n", httpCode, jsonPayload.c_str());
  http.end();
}
```

---

## 📡 Model 2: Integrasi ESP32 Menggunakan MQTT Broker

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "Nama_WiFi_Anda";
const char* WIFI_PASSWORD = "Password_WiFi_Anda";
const char* MQTT_SERVER   = "192.168.1.100";
const int   MQTT_PORT     = 1884;

const char* DEVICE_ID  = "esp32-sensor-01";
const char* API_KEY    = "dev-secret-key-123";
const char* MQTT_TOPIC = "telemetry/data";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) reconnectMqtt();
  mqttClient.loop();

  static unsigned long lastPub = 0;
  if (millis() - lastPub >= 5000) {
    lastPub = millis();
    publishTelemetry();
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect(DEVICE_ID, DEVICE_ID, API_KEY)) {
      Serial.println("[MQTT] Terhubung & Auth Valid!");
    } else {
      delay(5000);
    }
  }
}

void publishTelemetry() {
  StaticJsonDocument<200> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = 26.5 + random(0, 80) / 10.0;
  doc["humidity"]    = 55.0 + random(0, 150) / 10.0;

  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);

  bool ok = mqttClient.publish(MQTT_TOPIC, jsonBuffer);
  Serial.printf("[MQTT] Publish: %s\n", ok ? "OK" : "FAILED");
}
```

---

## ⚡ Model 3: Integrasi ESP32 Menggunakan CoAP UDP Protocol

```cpp
#include <WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "Nama_WiFi_Anda";
const char* WIFI_PASSWORD = "Password_WiFi_Anda";
const char* GATEWAY_IP   = "192.168.1.100";
const int   COAP_PORT    = 5683;

const char* DEVICE_ID = "esp32-sensor-01";
const char* API_KEY   = "dev-secret-key-123";

WiFiUDP udp;
Coap coap(udp);

void callbackResponse(CoapPacket &packet, IPAddress ip, int port) {
  Serial.print("[CoAP] Response Code: ");
  Serial.println(packet.code);
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }

  coap.response(callbackResponse);
  coap.start();
}

void loop() {
  coap.loop();
  static unsigned long lastCoap = 0;
  if (millis() - lastCoap >= 5000) {
    lastCoap = millis();
    sendCoapTelemetry();
  }
}

void sendCoapTelemetry() {
  StaticJsonDocument<200> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = 26.2 + random(0, 70) / 10.0;
  doc["humidity"]    = 62.0 + random(0, 100) / 10.0;

  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);

  IPAddress ip;
  ip.fromString(GATEWAY_IP);

  int msgId = coap.post(ip, COAP_PORT, "telemetry", jsonBuffer, strlen(jsonBuffer));
  Serial.printf("[CoAP] Sent POST /telemetry (ID: %d): %s\n", msgId, jsonBuffer);
}
```

---

## 🔍 Verifikasi & Log Container Docker
```bash
docker logs -f iot-gateway
```
* **CoAP Log Sukses**: `[CoAP] ✅ Data Valid di /telemetry dari device "esp32-sensor-01". Meneruskan...`
