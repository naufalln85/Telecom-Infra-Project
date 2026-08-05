import { useState } from "react";
import {
  Box, Repeat, Layout, Users, Play, CheckCircle2, Circle, ArrowRight,
  Sparkles, Database, ShieldCheck, Cpu, RefreshCw, Copy, Check, Radio, Wifi,
  Terminal, FileText, ExternalLink, Code, Layers, Zap, Brain, Activity,
  Sliders, Table, Bell, Shield, ChevronRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { dashboardAPI } from "../../services/api";

function GetStartedView({ onNavigateTab, userAccount }) {
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [activeModuleTab, setActiveModuleTab] = useState("hardware"); // 'hardware' | 'dashboard' | 'alerts' | 'aiml' | 'projects'
  const [checklist, setChecklist] = useState({
    intro: true,
    template: true,
    device: true,
    dashboard: false,
    app: false
  });

  // ESP32 Integration State
  const [activeProtocol, setActiveProtocol] = useState("mqtt"); // 'mqtt' | 'http' | 'coap'
  const [copied, setCopied] = useState(false);
  const [espConfig, setEspConfig] = useState({
    wifiSsid: "WiFi_Rumah_Anda",
    wifiPass: "Password_WiFi_123",
    gatewayIp: "192.168.1.100",
    deviceId: "esp32-sensor-01",
    apiKey: "dev-secret-key-123"
  });

  const handleToggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSeedData = async () => {
    setLoadingSeed(true);
    try {
      await dashboardAPI.seedMock();
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22C55E", "#34D399", "#A7F3D0"]
      });
    } catch {
      // fallback
    } finally {
      setLoadingSeed(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setEspConfig(prev => ({ ...prev, [field]: value }));
  };

  // Generate Arduino C++ Code dynamically for MQTT, HTTP, and CoAP
  const getEsp32Code = () => {
    if (activeProtocol === "coap") {
      return `/**
 * ============================================================================
 * ESP32 Telemetry Ingestion — CoAP UDP Model
 * Target: Telecom Infra Project IoT Gateway
 * ============================================================================
 */
#include <WiFi.h>
#include <WiFiUdp.h>
#include <coap-simple.h> // Library coap-simple oleh Hirotaka Ster
#include <ArduinoJson.h>

const char* WIFI_SSID     = "${espConfig.wifiSsid}";
const char* WIFI_PASSWORD = "${espConfig.wifiPass}";
const char* GATEWAY_IP   = "${espConfig.gatewayIp}";
const int   COAP_PORT    = 5683; // Gateway CoAP UDP Port

const char* DEVICE_ID = "${espConfig.deviceId}";
const char* API_KEY   = "${espConfig.apiKey}";

WiFiUDP udp;
Coap coap(udp);
unsigned long lastSendTime = 0;

void callbackResponse(CoapPacket &packet, IPAddress ip, int port) {
  Serial.print("[CoAP] Response Code: ");
  Serial.println(packet.code);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\\n[ESP32] Memulai Telemetri CoAP UDP...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Terhubung! IP: " + WiFi.localIP().toString());

  coap.response(callbackResponse);
  coap.start();
}

void loop() {
  coap.loop();
  if (millis() - lastSendTime >= 5000) {
    lastSendTime = millis();
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

  // Send CoAP POST request to /telemetry
  int msgId = coap.post(ip, COAP_PORT, "telemetry", jsonBuffer, strlen(jsonBuffer));
  Serial.printf("[CoAP] Sent POST /telemetry (ID: %d): %s\\n", msgId, jsonBuffer);
}`;
    }

    if (activeProtocol === "mqtt") {
      return `/**
 * ============================================================================
 * ESP32 Telemetry Ingestion — MQTT Broker Model
 * Target: Telecom Infra Project IoT Gateway
 * ============================================================================
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── Konfigurasi WiFi & MQTT ──
const char* WIFI_SSID     = "${espConfig.wifiSsid}";
const char* WIFI_PASSWORD = "${espConfig.wifiPass}";
const char* MQTT_SERVER   = "${espConfig.gatewayIp}";
const int   MQTT_PORT     = 1884; // Gateway MQTT Port

// ── Credential & Topics ──
const char* DEVICE_ID  = "${espConfig.deviceId}";
const char* API_KEY    = "${espConfig.apiKey}"; // Auth Key digunakan sebagai MQTT Password
const char* MQTT_TOPIC = "telemetry/data";

WiFiClient espClient;
PubSubClient mqttClient(espClient);
unsigned long lastPublishTime = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\\n[ESP32] Memulai Telemetri MQTT...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Terhubung! IP: " + WiFi.localIP().toString());

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  if (millis() - lastPublishTime >= 5000) {
    lastPublishTime = millis();
    publishTelemetry();
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Menghubungkan ke Broker Gateway (" + String(MQTT_SERVER) + ":1884)... ");
    if (mqttClient.connect(DEVICE_ID, DEVICE_ID, API_KEY)) {
      Serial.println("BERHASIL! 🔑 Auth Valid.");
    } else {
      Serial.printf("GAGAL (rc=%d), mencoba lagi 5 dtk...\\n", mqttClient.state());
      delay(5000);
    }
  }
}

void publishTelemetry() {
  StaticJsonDocument<200> doc;
  doc["device_id"]   = DEVICE_ID;
  doc["temperature"] = 25.5 + random(0, 100) / 10.0;
  doc["humidity"]    = 60.0 + random(0, 200) / 10.0;

  char jsonBuffer[200];
  serializeJson(doc, jsonBuffer);

  Serial.print("[MQTT] Publish: ");
  Serial.println(jsonBuffer);
  bool ok = mqttClient.publish(MQTT_TOPIC, jsonBuffer);
  if (ok) Serial.println("       --> Publish Berhasil ✅");
  else Serial.println("       --> Publish Gagal ❌");
}`;
    }

    return `/**
 * ============================================================================
 * ESP32 Telemetry Ingestion — HTTP REST API Model
 * Target: Telecom Infra Project IoT Gateway
 * ============================================================================
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "${espConfig.wifiSsid}";
const char* WIFI_PASSWORD = "${espConfig.wifiPass}";
const char* GATEWAY_IP   = "${espConfig.gatewayIp}";
const int   GATEWAY_PORT = 3000;

const char* DEVICE_ID = "${espConfig.deviceId}";
const char* API_KEY   = "${espConfig.apiKey}";

const unsigned long SEND_INTERVAL_MS = 5000;
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\\n[ESP32] Memulai Telemetri HTTP...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Terhubung! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();
    if (WiFi.status() == WL_CONNECTED) {
      sendHttpTelemetry();
    } else {
      WiFi.reconnect();
    }
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
  doc["temperature"] = 26.0 + random(0, 80) / 10.0;
  doc["humidity"]    = 58.0 + random(0, 150) / 10.0;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.println("[HTTP] Sending POST payload to " + url);
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Code: %d | Reply: %s\\n", httpResponseCode, response.c_str());
  } else {
    Serial.printf("[HTTP] Error Code: %d (%s)\\n", httpResponseCode, http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getEsp32Code());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const userName = userAccount?.name || "naufal";

  return (
    <div className="blynk-getstarted-container">
      {/* LEFT MAIN AREA */}
      <div className="blynk-getstarted-main">
        <h1 className="blynk-page-title">
          Master Getting Started & Tutorial Hub 🚀
        </h1>

        {/* PLAN DETAILS METRIC BAR */}
        <div className="blynk-plan-details-grid">
          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Box size={18} /></div>
            <div>
              <div className="plan-detail-val">1/5</div>
              <div className="plan-detail-lbl">Devices</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Repeat size={18} /></div>
            <div>
              <div className="plan-detail-val">0/100000</div>
              <div className="plan-detail-lbl">Device messages</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Layout size={18} /></div>
            <div>
              <div className="plan-detail-val">1/10</div>
              <div className="plan-detail-lbl">Templates created</div>
            </div>
          </div>

          <div className="plan-detail-card">
            <div className="plan-detail-icon"><Users size={18} /></div>
            <div>
              <div className="plan-detail-val">1/1</div>
              <div className="plan-detail-lbl">Team members</div>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* 5-MODULE COMPREHENSIVE TUTORIAL HUB */}
        {/* -------------------------------------------------------------------- */}
        <div className="master-tutorial-module-bar">
          <button
            type="button"
            className={`tutorial-tab-btn ${activeModuleTab === "hardware" ? "active" : ""}`}
            onClick={() => setActiveModuleTab("hardware")}
          >
            <Cpu size={16} /> 1. Hardware & Protocols (MQTT, HTTP, CoAP)
          </button>
          <button
            type="button"
            className={`tutorial-tab-btn ${activeModuleTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveModuleTab("dashboard")}
          >
            <Layout size={16} /> 2. Dashboard & Widgets
          </button>
          <button
            type="button"
            className={`tutorial-tab-btn ${activeModuleTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveModuleTab("alerts")}
          >
            <Zap size={16} /> 3. Alerts & Automations
          </button>
          <button
            type="button"
            className={`tutorial-tab-btn ${activeModuleTab === "aiml" ? "active" : ""}`}
            onClick={() => setActiveModuleTab("aiml")}
          >
            <Brain size={16} /> 4. AI / ML Builder
          </button>
          <button
            type="button"
            className={`tutorial-tab-btn ${activeModuleTab === "projects" ? "active" : ""}`}
            onClick={() => setActiveModuleTab("projects")}
          >
            <Layers size={16} /> 5. Multi-Project Isolation
          </button>
        </div>

        {/* MODULE 1: HARDWARE INTEGRATION & PROTOCOL SELECTOR */}
        {activeModuleTab === "hardware" && (
          <div className="esp32-integration-section">
            <div className="esp32-section-header">
              <div className="esp32-header-title">
                <div className="esp32-badge-icon">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3>ESP32 Hardware & Multi-Protocol Guide</h3>
                  <p>Integrasikan ESP32 Anda menggunakan MQTT Broker, HTTP REST API, atau CoAP UDP Protocol</p>
                </div>
              </div>

              {/* Protocol Switcher Pills (MQTT, HTTP, CoAP) */}
              <div className="esp32-protocol-selector">
                <button
                  type="button"
                  className={`protocol-btn ${activeProtocol === "mqtt" ? "active" : ""}`}
                  onClick={() => setActiveProtocol("mqtt")}
                >
                  <Radio size={14} /> MQTT (Port 1884)
                </button>
                <button
                  type="button"
                  className={`protocol-btn ${activeProtocol === "http" ? "active" : ""}`}
                  onClick={() => setActiveProtocol("http")}
                >
                  <Wifi size={14} /> HTTP (Port 3000)
                </button>
                <button
                  type="button"
                  className={`protocol-btn ${activeProtocol === "coap" ? "active" : ""}`}
                  onClick={() => setActiveProtocol("coap")}
                >
                  <Activity size={14} /> CoAP UDP (Port 5683)
                </button>
              </div>
            </div>

            {/* Quick Specifications Banner */}
            <div className="esp32-spec-banner">
              <div className="spec-item">
                <span className="spec-label">Protokol Terpilih:</span>
                <span className="spec-val highlight">
                  {activeProtocol === "mqtt" ? "MQTT (Aedes Broker)" : activeProtocol === "http" ? "HTTP POST (REST API)" : "CoAP UDP Protocol"}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Target Port:</span>
                <span className="spec-val">{activeProtocol === "mqtt" ? "1884" : activeProtocol === "http" ? "3000" : "5683 (UDP)"}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">{activeProtocol === "mqtt" ? "Topic Target:" : "Path / Resource:"}</span>
                <span className="spec-val code-font">
                  {activeProtocol === "mqtt" ? "telemetry/data" : activeProtocol === "http" ? "/api/v1/telemetry" : "/telemetry"}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Metode Autentikasi:</span>
                <span className="spec-val">
                  {activeProtocol === "mqtt" ? "MQTT Password = API Key" : activeProtocol === "http" ? "Header x-api-key" : "Header authorization"}
                </span>
              </div>
            </div>

            {/* Interactive Parameters Configurator */}
            <div className="esp32-config-panel">
              <h4 className="config-title">
                <Code size={16} /> Ubah Parameter Inisialisasi Kode
              </h4>
              <div className="esp32-inputs-grid">
                <div className="esp32-input-group">
                  <label>WiFi SSID</label>
                  <input
                    type="text"
                    value={espConfig.wifiSsid}
                    onChange={(e) => handleConfigChange("wifiSsid", e.target.value)}
                    placeholder="SSID WiFi"
                  />
                </div>

                <div className="esp32-input-group">
                  <label>WiFi Password</label>
                  <input
                    type="password"
                    value={espConfig.wifiPass}
                    onChange={(e) => handleConfigChange("wifiPass", e.target.value)}
                    placeholder="Password WiFi"
                  />
                </div>

                <div className="esp32-input-group">
                  <label>Gateway IP Host</label>
                  <input
                    type="text"
                    value={espConfig.gatewayIp}
                    onChange={(e) => handleConfigChange("gatewayIp", e.target.value)}
                    placeholder="192.168.x.x"
                  />
                </div>

                <div className="esp32-input-group">
                  <label>Device ID</label>
                  <input
                    type="text"
                    value={espConfig.deviceId}
                    onChange={(e) => handleConfigChange("deviceId", e.target.value)}
                    placeholder="esp32-01"
                  />
                </div>

                <div className="esp32-input-group">
                  <label>Device API Key</label>
                  <input
                    type="text"
                    value={espConfig.apiKey}
                    onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                    placeholder="API Key Perangkat"
                  />
                </div>
              </div>
            </div>

            {/* Live Dynamic Code Block */}
            <div className="esp32-code-block-container">
              <div className="code-block-header">
                <div className="code-filename">
                  <Terminal size={14} />
                  <span>ESP32_{activeProtocol.toUpperCase()}_Ingestion.ino</span>
                </div>
                <button type="button" className="btn-copy-code" onClick={handleCopyCode}>
                  {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                  {copied ? "Berhasil Disalin!" : "Salin Kode C++"}
                </button>
              </div>
              <pre className="code-viewport">
                <code>{getEsp32Code()}</code>
              </pre>
            </div>

            {/* Step-by-Step Integration Steps */}
            <div className="esp32-steps-grid">
              <div className="esp32-step-card">
                <div className="step-number">1</div>
                <div className="step-info">
                  <h5>Siapkan Library Arduino IDE</h5>
                  <p>Instal <strong>ArduinoJson</strong> {activeProtocol === "mqtt" ? "dan PubSubClient" : activeProtocol === "coap" ? "dan coap-simple" : ""} melalui Library Manager.</p>
                </div>
              </div>

              <div className="esp32-step-card">
                <div className="step-number">2</div>
                <div className="step-info">
                  <h5>Upload & Buka Serial Monitor</h5>
                  <p>Upload sketsa di atas ke ESP32, atur Serial Monitor ke <strong>115200 baud</strong> untuk melihat respon.</p>
                </div>
              </div>

              <div className="esp32-step-card">
                <div className="step-number">3</div>
                <div className="step-info">
                  <h5>Verifikasi Ingestion Gateway</h5>
                  <p>Jalankan <code>docker logs -f iot-gateway</code> di terminal server untuk memantau lalu lintas data.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: DASHBOARD & WIDGET TUTORIAL */}
        {activeModuleTab === "dashboard" && (
          <div className="tutorial-module-card">
            <div className="tutorial-module-header">
              <Layout size={22} style={{ color: "#22C55E" }} />
              <div>
                <h4>Panduan Membangun Dashboard & Widget Visual</h4>
                <p>Pelajari cara menyusun kanvas visual interaktif untuk memantau data sensor secara real-time</p>
              </div>
            </div>
            <div className="tutorial-steps-list">
              <div className="tutorial-step-row">
                <span className="step-badge-green">Langkah 1</span>
                <div>
                  <strong>Buka Menu Dashboards</strong>
                  <p>Klik tab <b>Dashboards</b> di sidebar kiri untuk masuk ke kanvas visual.</p>
                </div>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("dashboards")}>
                  Buka Dashboards <ArrowRight size={14} />
                </button>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-green">Langkah 2</span>
                <div>
                  <strong>Buka Widget Box & Pilih Widget</strong>
                  <p>Klik tombol <b>Edit Mode (On)</b> untuk membuka Widget Box. Pilih dari variasi widget: <b>Switch, Slider, Label Tile, Gauge, Line Chart, Map,</b> atau <b>Sensor Telemetry Table</b>.</p>
                </div>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-green">Langkah 3</span>
                <div>
                  <strong>Konfigurasi Datastream & Channel</strong>
                  <p>Klik icon roda gigi pada widget untuk mengatur batas nilai (Min/Max), nama channel (e.g., <code>temperature</code>, <code>humidity</code>), dan tema warna.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 3: ALERTS & AUTOMATIONS */}
        {activeModuleTab === "alerts" && (
          <div className="tutorial-module-card">
            <div className="tutorial-module-header">
              <Zap size={22} style={{ color: "#F59E0B" }} />
              <div>
                <h4>Panduan Alert Rules & Engine Otomatisasi</h4>
                <p>Siapkan ambang batas (threshold) sensor dan saluran notifikasi instan</p>
              </div>
            </div>
            <div className="tutorial-steps-list">
              <div className="tutorial-step-row">
                <span className="step-badge-amber">Langkah 1</span>
                <div>
                  <strong>Buka Menu Automations</strong>
                  <p>Klik tab <b>Automations</b> untuk membuat aturan pemicu kondisi telemetri.</p>
                </div>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("automations")}>
                  Buka Automations <ArrowRight size={14} />
                </button>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-amber">Langkah 2</span>
                <div>
                  <strong>Tambahkan Aturan Ambang Batas (Rule)</strong>
                  <p>Atur pemicu seperti <code>temperature &gt; 35°C</code> dengan cooldown waktu pencegahan spam notifikasi.</p>
                </div>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-amber">Langkah 3</span>
                <div>
                  <strong>Integrasi Notification Channels</strong>
                  <p>Tambahkan Email SMTP, Webhook Discord/Telegram, atau Push Notification ke HP.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 4: AI / ML BUILDER */}
        {activeModuleTab === "aiml" && (
          <div className="tutorial-module-card">
            <div className="tutorial-module-header">
              <Brain size={22} style={{ color: "#38BDF8" }} />
              <div>
                <h4>Panduan AI / ML Builder & Anomaly Detection</h4>
                <p>Melatih model kecerdasan buatan dari data historis telemetri untuk deteksi anomali otomatis</p>
              </div>
            </div>
            <div className="tutorial-steps-list">
              <div className="tutorial-step-row">
                <span className="step-badge-cyan">Langkah 1</span>
                <div>
                  <strong>Buka AI / ML Builder Studio</strong>
                  <p>Masuk ke modul <b>AI / ML Builder</b> di sidebar navigasi.</p>
                </div>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("ai-builder")}>
                  Buka AI Studio <ArrowRight size={14} />
                </button>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-cyan">Langkah 2</span>
                <div>
                  <strong>Train Model & Inferensi ONNX</strong>
                  <p>Pilih dataset telemetri project dan latih model klasifikasi/regresi untuk mendeteksi kegagalan perangkat sebelum terjadi.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 5: MULTI-PROJECT ISOLATION */}
        {activeModuleTab === "projects" && (
          <div className="tutorial-module-card">
            <div className="tutorial-module-header">
              <Layers size={22} style={{ color: "#A855F7" }} />
              <div>
                <h4>Panduan Manajemen Multi-Project Tenant</h4>
                <p>Isolasi data perangkat, anggota tim, dan kanvas dashboard per project</p>
              </div>
            </div>
            <div className="tutorial-steps-list">
              <div className="tutorial-step-row">
                <span className="step-badge-purple">Langkah 1</span>
                <div>
                  <strong>Buka Menu Organizations / Project Selector</strong>
                  <p>Klik nama project di pojok kiri atas topbar untuk membuka dialog Manajemen Project.</p>
                </div>
              </div>

              <div className="tutorial-step-row">
                <span className="step-badge-purple">Langkah 2</span>
                <div>
                  <strong>Buat & Beralih Antar Project</strong>
                  <p>Setiap project memiliki isolated dashboard layout, daftar device, dan daftar user secara terpisah demi keamanan data.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUGGESTED FOR YOU CARDS */}
        <div className="blynk-suggested-section" style={{ marginTop: 32 }}>
          <h3 className="section-subtitle">SUGGESTED FOR YOU</h3>

          <div className="blynk-suggested-grid">
            <div className="blynk-card-item">
              <div className="card-illustration-box img-blueprints" />
              <div className="card-body-content">
                <h4>Create your app in minutes with Blueprints</h4>
                <p>Use a pre-built template with all the essentials to get your device up and running instantly.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("dashboards")}>
                  View Blueprints
                </button>
              </div>
            </div>

            <div className="blynk-card-item">
              <div className="card-illustration-box img-customize" />
              <div className="card-body-content">
                <h4>Customize your app's look and feel</h4>
                <p>Skip the time-consuming app review process and customize your app with no coding required.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("dashboards")}>
                  Learn More <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="blynk-card-item">
              <div className="card-illustration-box img-automations" />
              <div className="card-body-content">
                <h4>No-code automations</h4>
                <p>Automate device actions, alerts, and conditions without writing extra code—across your IoT ecosystem.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("automations")}>
                  Try Now
                </button>
              </div>
            </div>

            <div className="blynk-card-item">
              <div className="card-illustration-box img-notifications" />
              <div className="card-body-content">
                <h4>Events, alert notifications</h4>
                <p>Track important events, receive real-time alerts, and send automated notifications for your devices.</p>
                <button type="button" className="btn-blynk-outlined" onClick={() => onNavigateTab("automations")}>
                  Learn More <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STAGING QUICK START HELPER */}
        <div className="blynk-staging-banner">
          <div>
            <h4 style={{ margin: 0, color: "#FFFFFF", display: "flex", alignItems: "center", gap: 8 }}>
              <Database size={18} style={{ color: "#22C55E" }} /> Staging & Real Data Readiness
            </h4>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Ingin menguji skema PostgreSQL, Redis cooldown, dan IoT Protocol Gateway (HTTP, MQTT, CoAP)?
            </p>
          </div>
          <button type="button" className="btn-blynk-primary" onClick={handleSeedData} disabled={loadingSeed}>
            <RefreshCw size={14} className={loadingSeed ? "spin" : ""} />
            {loadingSeed ? "Seeding Data..." : "Seed Staging Test Data"}
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR CHECKLIST */}
      <div className="blynk-getstarted-sidebar">
        <div className="blynk-welcome-card">
          <div className="welcome-card-header">
            <h3>Welcome, {userName}</h3>
            <p>Here's a quick checklist to get you up to speed with Blynk Platform:</p>
          </div>

          <div className="checklist-items">
            <div className="checklist-item-row" onClick={() => handleToggleCheck("intro")}>
              <div className="item-checkbox">
                {checklist.intro ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.intro ? "completed" : ""}`}>Intro to Blynk</span>
                <div className="video-thumbnail-card">
                  <div className="play-button-overlay">
                    <Play size={20} fill="#FFFFFF" color="#FFFFFF" />
                  </div>
                  <div className="video-text">
                    <strong>Blynk Onboarding #1: Welcome</strong>
                    <span>Watch platform video to quickly understand Blynk</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="checklist-item-row" onClick={() => handleToggleCheck("template")}>
              <div className="item-checkbox">
                {checklist.template ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.template ? "completed" : ""}`}>Add template or blueprint</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            <div className="checklist-item-row" onClick={() => { handleToggleCheck("device"); onNavigateTab("devices"); }}>
              <div className="item-checkbox">
                {checklist.device ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.device ? "completed" : ""}`}>Connect first device (ESP32)</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            <div className="checklist-item-row" onClick={() => { handleToggleCheck("dashboard"); onNavigateTab("dashboards"); }}>
              <div className="item-checkbox">
                {checklist.dashboard ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.dashboard ? "completed" : ""}`}>Build a dashboard</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>

            <div className="checklist-item-row" onClick={() => handleToggleCheck("app")}>
              <div className="item-checkbox">
                {checklist.app ? <CheckCircle2 size={18} className="icon-checked" /> : <Circle size={18} className="icon-unchecked" />}
              </div>
              <div className="item-content">
                <span className={`item-title ${checklist.app ? "completed" : ""}`}>Download Blynk App</span>
              </div>
              <ArrowRight size={14} className="item-arrow" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GetStartedView;
