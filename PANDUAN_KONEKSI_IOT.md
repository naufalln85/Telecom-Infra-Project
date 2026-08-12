# 🔌 Panduan Lengkap Koneksi IoT Device — Yugma IoT Platform

Panduan ini menjelaskan cara menambahkan user/device dan menyambungkan perangkat IoT fisik (ESP32, Arduino, Raspberry Pi, dll) ke platform.

---

## 📱 BAGIAN 1 — Manajemen User & Device via Dashboard

### 1.1 Login ke Dashboard

Buka browser: `http://10.10.10.2:5173`

- Klik tombol **Sign In** di navbar
- Gunakan akun yang sudah ada atau registrasi dengan email baru (otomatis terdaftar)

---

### 1.2 Tambah Perangkat IoT Baru

> Semua data tersimpan ke PostgreSQL — tidak ada data dummy.

**Lewat Dashboard UI:**

1. Klik menu **Devices** di sidebar kiri
2. Klik tombol **+ Add Device**
3. Masukkan nama device (misal: `ESP32-Greenhouse-01`)
4. Klik **Save** → Platform akan membuat:
   - ✅ Record device di database
   - ✅ **API Key unik** untuk device ini (tampil sekali!)
   - ✅ 3 channel default: `temperature`, `humidity`, `relay_1`

> ⚠️ **Simpan API Key!** API Key hanya ditampilkan satu kali saat device dibuat.

**Lewat API (jika ingin otomatis):**

```bash
# Buat project terlebih dahulu
curl -X POST http://10.10.10.2:8000/api/v1/projects \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Greenhouse Monitoring"}'

# Output: {"data": {"id": 1, "name": "..."}}

# Buat device di project tersebut
curl -X POST http://10.10.10.2:8000/api/v1/projects/1/devices \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"ESP32-Greenhouse-01"}'

# Output: {"data": {"id": 5, "name": "...", "api_key": "tip_live_XXXXXXXXXXXX"}}
```

---

### 1.3 Tambah User / Anggota Tim

1. Di menu **Users/Members**, klik **+ Invite Member**
2. Masukkan email anggota dan pilih role (`Admin` / `Staff` / `Viewer`)
3. Klik **Send Invite** → Akun otomatis terbuat di database

---

## 🔧 BAGIAN 2 — Koneksi Perangkat IoT via HTTP

### Format Payload Umum

```json
{
  "api_key": "tip_live_XXXXXXXXXXXX",
  "data": {
    "temperature": 28.5,
    "humidity": 65.2,
    "relay_1": false
  }
}
```

### 2.1 ESP32 / Arduino via HTTP (Termudah)

```cpp
// ESP32 Arduino Sketch — Kirim data sensor via HTTP POST
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── Konfigurasi ─────────────────────────────────────────────
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* SERVER_URL    = "http://10.10.10.2:3000/api/v1/telemetry";
const char* API_KEY       = "tip_live_XXXXXXXXXXXX";  // ← ganti dengan API Key device

// DHT22 sensor di pin 4
DHT dht(4, DHT22);

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  float temp  = dht.readTemperature();
  float humid = dht.readHumidity();
  
  if (isnan(temp) || isnan(humid)) {
    Serial.println("DHT22 read error!"); 
    delay(5000); return;
  }
  
  // Buat JSON payload
  DynamicJsonDocument doc(256);
  doc["api_key"] = API_KEY;
  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temp;
  data["humidity"]    = humid;
  
  String payload;
  serializeJson(doc, payload);
  
  // Kirim HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[HTTP %d] Sent: temp=%.1f°C, humid=%.1f%%\n", code, temp, humid);
  } else {
    Serial.printf("[HTTP Error] %s\n", http.errorToString(code).c_str());
  }
  http.end();
  
  delay(10000);  // Kirim setiap 10 detik
}
```

**Library Arduino yang dibutuhkan:**
- `WiFi.h` (bawaan ESP32)
- `HTTPClient.h` (bawaan ESP32)
- `ArduinoJson` (install via Library Manager)
- `DHT sensor library` (install via Library Manager)

---

### 2.2 Raspberry Pi via Python HTTP

```python
#!/usr/bin/env python3
# pip install requests RPi.GPIO Adafruit_DHT

import requests
import Adafruit_DHT
import time

SERVER_URL = "http://10.10.10.2:3000/api/v1/telemetry"
API_KEY    = "tip_live_XXXXXXXXXXXX"  # ← ganti dengan API Key device

DHT_SENSOR = Adafruit_DHT.DHT22
DHT_PIN    = 4  # GPIO pin

def send_data(temp, humid):
    payload = {
        "api_key": API_KEY,
        "data": {
            "temperature": round(temp, 1),
            "humidity": round(humid, 1),
        }
    }
    try:
        r = requests.post(SERVER_URL, json=payload, timeout=5)
        print(f"[HTTP {r.status_code}] temp={temp:.1f}°C, humid={humid:.1f}%")
        return r.json()
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

if __name__ == "__main__":
    print("IoT Client started. Sending to:", SERVER_URL)
    while True:
        humid, temp = Adafruit_DHT.read_retry(DHT_SENSOR, DHT_PIN)
        if temp is not None and humid is not None:
            send_data(temp, humid)
        else:
            print("[WARN] Sensor read failed, retrying...")
        time.sleep(10)
```

---

## 📡 BAGIAN 3 — Koneksi via MQTT

**Broker:** `mqtt://10.10.10.2:1884`  
**Topic:** `telemetry/data`

### 3.1 ESP32 via MQTT (PubSubClient)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* WIFI_SSID     = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD_WIFI";
const char* MQTT_SERVER   = "10.10.10.2";
const int   MQTT_PORT     = 1884;
const char* MQTT_TOPIC    = "telemetry/data";
const char* API_KEY       = "tip_live_XXXXXXXXXXXX";

DHT dht(4, DHT22);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

void reconnect() {
  while (!mqttClient.connected()) {
    Serial.println("Connecting to MQTT...");
    if (mqttClient.connect("ESP32-Client")) {
      Serial.println("MQTT Connected!");
    } else {
      Serial.printf("MQTT failed rc=%d, retry in 5s\n", mqttClient.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) reconnect();
  mqttClient.loop();
  
  float temp  = dht.readTemperature();
  float humid = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(humid)) {
    DynamicJsonDocument doc(256);
    doc["api_key"] = API_KEY;
    JsonObject data = doc.createNestedObject("data");
    data["temperature"] = temp;
    data["humidity"]    = humid;
    
    String payload;
    serializeJson(doc, payload);
    
    mqttClient.publish(MQTT_TOPIC, payload.c_str());
    Serial.printf("[MQTT] Published: temp=%.1f°C humid=%.1f%%\n", temp, humid);
  }
  
  delay(10000);
}
```

### 3.2 Python MQTT Client

```python
#!/usr/bin/env python3
# pip install paho-mqtt

import paho.mqtt.client as mqtt
import json, time, random

API_KEY = "tip_live_XXXXXXXXXXXX"  # ← ganti dengan API Key device
BROKER  = "10.10.10.2"
PORT    = 1884
TOPIC   = "telemetry/data"

def send_data(client, temp, humid):
    payload = {
        "api_key": API_KEY,
        "data": {"temperature": temp, "humidity": humid}
    }
    client.publish(TOPIC, json.dumps(payload))
    print(f"[MQTT] Published: temp={temp}°C humid={humid}%")

client = mqtt.Client()
client.connect(BROKER, PORT, 60)
client.loop_start()

while True:
    # Ganti dengan pembacaan sensor sebenarnya
    temp  = round(25 + random.uniform(-3, 8), 1)
    humid = round(60 + random.uniform(-10, 15), 1)
    send_data(client, temp, humid)
    time.sleep(10)
```

---

## 🌐 BAGIAN 4 — Koneksi via CoAP (untuk perangkat ultra-hemat daya)

**Server:** `coap://10.10.10.2:5683/telemetry`

```python
#!/usr/bin/env python3
# pip install aiocoap

import asyncio
import aiocoap
import json

API_KEY = "tip_live_XXXXXXXXXXXX"

async def send_coap():
    context = await aiocoap.Context.create_client_context()
    payload = json.dumps({
        "api_key": API_KEY,
        "data": {"temperature": 28.5, "humidity": 65.0}
    }).encode()
    
    request = aiocoap.Message(
        code=aiocoap.POST,
        uri="coap://10.10.10.2/telemetry",
        payload=payload
    )
    response = await context.request(request).response
    print(f"[CoAP] Response: {response.code}")
    print(f"[CoAP] Payload: {response.payload.decode()}")

asyncio.run(send_coap())
```

---

## 📊 BAGIAN 5 — Alert Rules & Notifikasi

### Setup Alert Rule

Setelah device terdaftar dan mengirim data, buat rule agar dapat notifikasi otomatis:

1. Di dashboard, klik menu **Automation / Alert Rules**
2. Klik **+ Add Rule**
3. Pilih:
   - **Device**: Pilih device kamu
   - **Channel**: `temperature`
   - **Operator**: `>` (greater than)
   - **Threshold**: `35` (°C)
   - **Cooldown**: `60` (detik)
4. Klik **Save Rule**

Sekarang jika suhu melebihi 35°C, alert akan terpicu dan dicatat di database.

### Setup Notifikasi Telegram

1. Buat Telegram Bot via `@BotFather` → dapatkan **Bot Token**
2. Dapatkan **Chat ID** kamu dari `@userinfobot`
3. Di dashboard klik **Notifications** → **+ Add Channel**
4. Isi:
   - **Name**: `My Telegram Alert`
   - **Type**: `telegram`
   - **Bot Token**: `123456:ABC...`
   - **Chat ID**: `-100xxxxxxx`

---

## 🧪 BAGIAN 6 — Test & Verifikasi dari Terminal

### Test HTTP (dari server atau laptop):

```bash
# 1. Dapatkan JWT Token dulu
TOKEN=$(curl -s -X POST http://10.10.10.2:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kamu@gmail.com","password":"passwordkamu"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Buat project baru
curl -X POST http://10.10.10.2:8000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Greenhouse IoT"}'

# 3. Buat device baru (simpan api_key dari response!)
curl -X POST http://10.10.10.2:8000/api/v1/projects/1/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"ESP32-Node-01"}'

# 4. Kirim data sensor via IoT Gateway
curl -X POST http://10.10.10.2:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -d '{"api_key":"tip_live_XXXXXXXXXXXX","data":{"temperature":32.5,"humidity":72}}'

# 5. Cek log telemetri yang masuk
curl http://10.10.10.2:8000/api/v1/gateway/logs | python3 -m json.tool

# 6. Cek statistik gateway
curl http://10.10.10.2:8000/api/v1/gateway/stats | python3 -m json.tool
```

---

## 🔍 BAGIAN 7 — Monitoring & Debug

### Akses Swagger API Docs:
```
http://10.10.10.2:8000/docs
```

### Cek log backend di server:
```bash
docker compose logs -f backend
```

### Cek data di database langsung:
```bash
docker compose exec db psql -U tip_admin -d iot_platform_tip

# Lihat semua device
SELECT id, name, api_key_hash FROM devices;

# Lihat telemetri yang masuk (dari alert history)
SELECT * FROM alert_history ORDER BY triggered_at DESC LIMIT 10;

# Lihat akun yang terdaftar
SELECT id, email, tier, created_at FROM accounts ORDER BY id;
```

---

## 📋 Ringkasan Port & Endpoint

| Layanan | Port | URL |
|---|---|---|
| 🌐 Dashboard UI | 5173 | `http://10.10.10.2:5173` |
| ⚡ Backend API | 8000 | `http://10.10.10.2:8000` |
| 📄 API Docs | 8000 | `http://10.10.10.2:8000/docs` |
| 🌿 IoT HTTP Gateway | 3000 | `http://10.10.10.2:3000/api/v1/telemetry` |
| 📡 MQTT Broker | 1884 | `mqtt://10.10.10.2:1884` |
| 📻 CoAP Server | 5683 | `coap://10.10.10.2/telemetry` |
| 🤖 AI Serving | 8001 | `http://10.10.10.2:8001` |

---

*Panduan ini dibuat untuk IoT Platform TIP — Riset Telecom Infra Project*
