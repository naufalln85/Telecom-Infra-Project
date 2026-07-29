# 📚 DOKUMENTASI LENGKAP — IoT Platform TIP
## Telecom Infra Project • Multi-Tenant IoT Platform
### Integrasi Modul A + B + C + D

> **Versi Dokumen**: 2.0 — Terintegrasi Modul A/B/C/D  
> **Terakhir Diperbarui**: Juli 2026  
> **Repository**: https://github.com/naufalln85/Telecom-Infra-Project

---

## 📑 DAFTAR ISI

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Arsitektur Platform](#2-arsitektur-platform)
3. [Komponen Modul](#3-komponen-modul)
4. [Struktur Direktori Proyek](#4-struktur-direktori-proyek)
5. [Alur Data End-to-End](#5-alur-data-end-to-end)
6. [Panduan Setup & Instalasi](#6-panduan-setup--instalasi)
7. [Panduan Penggunaan Aplikasi](#7-panduan-penggunaan-aplikasi)
8. [Spesifikasi API Lengkap](#8-spesifikasi-api-lengkap)
9. [Konfigurasi Environment](#9-konfigurasi-environment)
10. [Pengujian & Verifikasi](#10-pengujian--verifikasi)
11. [Arsitektur Docker](#11-arsitektur-docker)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. RINGKASAN SISTEM

**IoT Platform TIP** adalah platform Internet of Things **multi-tenant** yang dirancang untuk menerima, memproses, menyimpan, memvisualisasikan, dan menganalisis data telemetri dari perangkat sensor IoT. Platform ini dibangun sebagai proyek kolaboratif 4 modul mahasiswa:

| Modul | Peran | Teknologi Utama |
|-------|-------|-----------------|
| **Modul A** | Database Infrastructure & Backend API | PostgreSQL 15 + TimescaleDB, Redis 7, FastAPI, Alembic |
| **Modul B** | Protocol Gateway & Ingestion | Node.js, Express, Aedes (MQTT), CoAP, Ajv |
| **Modul C** | Frontend Dashboard & Visualisasi | React 19, Vite, Recharts, Leaflet, Socket.IO |
| **Modul D** | AI Serving & Model Inference | Python, ONNX Runtime, Docker Sandbox |

### Fitur Utama
- ✅ **Multi-Tenant**: Setiap akun bisa memiliki banyak proyek, setiap proyek memiliki device sendiri
- ✅ **Multi-Protocol Ingestion**: Device bisa kirim data via HTTP, MQTT, atau CoAP
- ✅ **Real-time Alert Engine**: Evaluasi threshold otomatis + cooldown anti-spam via Redis
- ✅ **SHA-256 Device Authentication**: API Key perangkat divalidasi dengan hash kriptografi
- ✅ **Immutable Audit Trail**: Trigger database menyimpan snapshot rule ke JSONB otomatis
- ✅ **AI Inference**: Analisis data sensor menggunakan model ONNX
- ✅ **Interactive Dashboard**: Drag-and-drop widgets, dark/light mode, Gateway Monitor

---

## 2. ARSITEKTUR PLATFORM

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PERANGKAT IoT (Sensor/Aktuator)                      │
│                                                                              │
│   [ESP32/Arduino]         [Raspberry Pi]          [Industrial PLC]            │
│        │ HTTP                 │ MQTT                   │ CoAP                │
│        │ POST                 │ PUB                    │ POST                │
└────────┼─────────────────────┼────────────────────────┼──────────────────────┘
         │                     │                        │
         ▼                     ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    IoT PROTOCOL GATEWAY (Modul B — Node.js)                   │
│                         Container: tip_iot_gateway                             │
│                                                                              │
│   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│   │  HTTP Server   │  │  MQTT Broker   │  │  CoAP Server   │                │
│   │  Express:3000  │  │  Aedes:1884    │  │  UDP:5683      │                │
│   └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                │
│           │                   │                    │                          │
│           └───────────────────┼────────────────────┘                          │
│                               │ Ajv JSON Schema Validation                   │
│                               │ Axios HTTP POST                              │
│                               ▼                                              │
│                   Backend Forwarder Service                                   │
│                   POST → http://backend:8000/api/v1/save-data                │
└───────────────────────────────┼──────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Modul A — Python)                         │
│                       Container: tip_backend                                  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────┐           │
│   │  /api/v1/save-data  ← Penerima data dari Gateway            │           │
│   │  1. Hash API Key (SHA-256) → Cocokkan di DB                 │           │
│   │  2. Log telemetri ke in-memory buffer                       │           │
│   │  3. Evaluasi Alert Rules → Threshold Check                  │           │
│   │  4. Redis Cooldown → Anti-spam notifikasi                   │           │
│   └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
│   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐          │
│   │  Auth (JWT)      │  │  CRUD API        │  │  Alert Engine   │          │
│   │  Register/Login  │  │  Projects/Device │  │  Trigger + Log  │          │
│   └──────────────────┘  └──────────────────┘  └─────────────────┘          │
└───────────────┬──────────────────┬──────────────────┬────────────────────────┘
                │                  │                  │
     ┌──────────▼──────────┐  ┌───▼──────┐   ┌──────▼──────┐
     │  PostgreSQL 15      │  │  Redis 7 │   │ AI Serving  │
     │  + TimescaleDB      │  │  Cache   │   │ Modul D     │
     │  Container:         │  │  Cooldown│   │ ONNX Model  │
     │  tip_postgres       │  │  tip_redis│  │ tip_ai      │
     └──────────┬──────────┘  └──────────┘   └─────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND DASHBOARD (Modul C — React)                       │
│                       Container: tip_frontend                                 │
│                                                                              │
│   ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │
│   │ Dashboard  │ │ Sensors  │ │ Analytics │ │ Alerts   │ │ Gateway      │  │
│   │ Widgets    │ │ Channels │ │ Charts    │ │ Rules    │ │ Monitor      │  │
│   └────────────┘ └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. KOMPONEN MODUL

### 3.1 Modul A — Database Infrastructure & Backend API

**Peran**: Fondasi data dan logika bisnis seluruh platform.

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| Database | PostgreSQL 15 + TimescaleDB | Penyimpanan relasional + time-series |
| Cache | Redis 7 | Cache auth device, cooldown alert, event bus |
| Backend | FastAPI (Python) | REST API, JWT auth, alert engine |
| Migrasi | Alembic | Versioning skema database |
| Container | Docker | Isolasi & reproduksibilitas |

**Tabel Database (10 tabel)**:
- `accounts` — Akun pengguna (email, password_hash, tier)
- `projects` — Proyek multi-tenant
- `project_members` — Relasi akun-proyek (owner/viewer)
- `devices` — Perangkat IoT (api_key_hash SHA-256)
- `data_channels` — Kanal data sensor (numeric/boolean/geo)
- `alert_rules` — Aturan alert (threshold, cooldown)
- `alert_rule_targets` — Target notifikasi per rule
- `notification_channels` — Kanal notifikasi (Telegram, etc.)
- `alert_history` — Riwayat alert (immutable audit trail)
- `active_alert_rules` (VIEW) — Hanya rule yang aktif

**Trigger Database Aktif (9 trigger)**:
- `trg_alert_history_context` — Menyalin snapshot rule ke JSONB saat alert dipicu
- `trg_projects_soft_delete` — Cascade soft-delete ke devices & notification channels
- Dan lainnya (lihat `db/migrations/versions/003_triggers_views.py`)

---

### 3.2 Modul B — IoT Protocol Gateway

**Peran**: Menerima data telemetri dari perangkat IoT melalui 3 protokol, memvalidasi, dan meneruskan ke backend.

| Protokol | Port | Library | Auth Method |
|----------|------|---------|-------------|
| **HTTP** | 3000 | Express | Header `x-api-key` |
| **MQTT** | 1884 | Aedes | Password = API Key |
| **CoAP** | 5683/UDP | node-coap | Header `authorization` |

**Alur Gateway**:
```
Device mengirim data
  → Gateway menerima (HTTP/MQTT/CoAP)
  → Ajv validasi JSON Schema (device_id, temperature, humidity wajib)
  → Jika valid: Axios POST ke backend /api/v1/save-data
  → Backend: Hash API Key → Cari device di DB → Log → Evaluasi alert
```

**Struktur Direktori Gateway**:
```
iot-gateway/
├── config/
│   └── constants.js          # Port, BACKEND_URL, Ajv Schema
├── services/
│   └── backend.service.js    # Axios forwarder ke backend
├── protocols/
│   ├── http.server.js        # Express REST API
│   ├── mqtt.broker.js        # Aedes MQTT Broker
│   └── coap.server.js        # CoAP UDP Server
├── index.js                  # Entry point
├── Dockerfile                # Docker image (node:20-alpine)
└── package.json              # Dependencies
```

---

### 3.3 Modul C — Frontend Dashboard

**Peran**: Visualisasi interaktif data sensor, alert, dan gateway monitoring.

**Fitur Dashboard**:
- 🎨 **Drag-and-Drop Widgets** — Kustom layout bento grid
- 🌙 **Dark/Light Mode** — Toggle tema
- 📊 **Recharts** — Grafik telemetri real-time
- 🗺️ **Leaflet Map** — Lokasi GPS perangkat
- 📡 **Gateway Monitor** — Status protokol, log ingest, test panel
- 🔔 **Alert Rules** — Kelola aturan alert
- ⚙️ **Admin Panel** — Seed data, soft-delete, restore
- 🔐 **JWT Authentication** — Login/Register

**Tab Navigasi**:
| Tab | View | Deskripsi |
|-----|------|-----------|
| Dashboard | Grid widgets | Overview KPI + bento card |
| Sensors | SensorsView | Daftar sensor channel |
| Actuators | ActuatorsView | Kontrol aktuator |
| Analytics | AnalyticsView | Grafik time-series |
| Alert Rules | AlertsView | Kelola threshold alert |
| **Gateway** | **GatewayView** | **Monitor protokol HTTP/MQTT/CoAP** |
| Settings | SettingsView | Pengaturan akun |
| Admin Panel | AdminPanelView | Manajemen database |

---

### 3.4 Modul D — AI Serving

**Peran**: Inferensi model machine learning (ONNX) untuk analisis data sensor.

| Komponen | Fungsi |
|----------|--------|
| ONNX Runtime | Eksekusi model ML |
| Docker Sandbox | Isolasi eksekusi model |
| Redis Integration | Terima event dari backend |

---

## 4. STRUKTUR DIREKTORI PROYEK

```
Riset_Telcome Infra Project/
│
├── 📄 docker-compose.yml          ← Orkestrator seluruh stack (6 services)
├── 📄 .env / .env.example         ← Konfigurasi rahasia
├── 📄 requirements.txt            ← Dependencies Python
├── 📄 alembic.ini                 ← Konfigurasi migrasi DB
├── 📄 setup_vm.sh                 ← Script instalasi otomatis VM
│
├── 📂 demo_app/                   ← MODUL A: Backend FastAPI
│   ├── main.py                    ← 25+ endpoint API
│   ├── templates/index.html       ← Dashboard web sederhana
│   └── Dockerfile                 ← Image Python 3.11
│
├── 📂 iot-gateway/                ← MODUL B: Protocol Gateway
│   ├── config/constants.js        ← Port, URL, Schema Ajv
│   ├── services/backend.service.js ← Axios forwarder
│   ├── protocols/
│   │   ├── http.server.js         ← Express :3000
│   │   ├── mqtt.broker.js         ← Aedes :1884
│   │   └── coap.server.js         ← CoAP :5683
│   ├── index.js                   ← Entry point
│   ├── Dockerfile                 ← Image Node 20 Alpine
│   └── package.json               ← Dependencies
│
├── 📂 Frontend-Iot-dashboard-main/ ← MODUL C: React Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx      ← Komponen utama + navigasi
│   │   │   ├── views/
│   │   │   │   ├── SensorsView.jsx
│   │   │   │   ├── ActuatorsView.jsx
│   │   │   │   ├── AnalyticsView.jsx
│   │   │   │   ├── AlertsView.jsx
│   │   │   │   ├── GatewayView.jsx  ← ★ Gateway Monitor (Modul B)
│   │   │   │   ├── SettingsView.jsx
│   │   │   │   └── AdminPanelView.jsx
│   │   │   └── widgets/
│   │   ├── services/api.js        ← API client (gatewayAPI ditambahkan)
│   │   └── App.jsx
│   ├── Dockerfile                 ← Nginx production build
│   └── package.json
│
├── 📂 AI SERVING/                 ← MODUL D: AI Inference
│   ├── app/
│   ├── main.py
│   └── Dockerfile
│
├── 📂 postgres/                   ← Konfigurasi PostgreSQL
│   ├── init.sql                   ← Ekstensi TimescaleDB
│   └── postgresql.conf            ← Tuning produksi
│
├── 📂 db/migrations/versions/     ← Alembic Migrations
│   ├── 001_hierarchy_auth.py      ← Tabel accounts, projects, devices
│   ├── 002_alerts_notifications.py ← Tabel alert_rules, notification_channels
│   └── 003_triggers_views.py      ← Trigger, VIEW, Index
│
├── 📂 DB Relation/                ← Spesifikasi & Verifikasi
│   ├── schema_modul_a.sql
│   ├── verify_schema.sql
│   ├── api_spec.md
│   └── device_api_key_spec.md
│
├── 📂 Flow DB Relation/           ← Diagram ERD
│   └── db_relation_flow_*.png
│
└── 📂 Dokumentasi/                ← Dokumentasi Proyek
    ├── DOKUMENTASI_LENGKAP_IOT_PLATFORM.md  ← ★ INI
    ├── Dokumentasi Project IOT Platform_TIP.md
    └── walkthrough.md
```

---

## 5. ALUR DATA END-TO-END

### Skenario: Device mengirim data suhu 38.5°C via MQTT

```
Langkah 1 — Device Konek ke MQTT Broker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Device ESP32 konek ke mqtt://gateway:1884
  Username: (kosong)
  Password: key_greenhouse_123  ← API Key sebagai password
  → Aedes authenticate() → Client.apiKey = "key_greenhouse_123" ✅

Langkah 2 — Device Publish Data Telemetri
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Publish ke topic: telemetry/data
Payload: {"device_id":"sensor-01","temperature":38.5,"humidity":62}
  → Aedes on('publish') trigger
  → JSON.parse(payload) ✅
  → Ajv validate(schema) ✅

Langkah 3 — Gateway Forward ke Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Axios POST http://backend:8000/api/v1/save-data
Body: {
  "protocol": "MQTT",
  "api_key": "key_greenhouse_123",
  "data": {"device_id":"sensor-01","temperature":38.5,"humidity":62}
}

Langkah 4 — Backend Validasi API Key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHA-256("key_greenhouse_123") = "8a12dbe8..."
SELECT * FROM devices WHERE api_key_hash = '8a12dbe8...'
  → Match: Device ID=1, "Sensor Suhu Kebun", Project ID=1 ✅

Langkah 5 — Log Telemetri
━━━━━━━━━━━━━━━━━━━━━━━━━
Data ditambahkan ke in-memory telemetry log.
(Dashboard Gateway Monitor bisa menampilkan data ini secara live)

Langkah 6 — Evaluasi Alert Rule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Query active_alert_rules VIEW:
  Rule ID=1: temperature > 35.0 (cooldown 60s)
  Value 38.5 > 35.0 → THRESHOLD VIOLATED!

Langkah 7 — Redis Cooldown Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Redis SET alert:cooldown:1 1 EX 60 NX
  → Key belum ada → SET berhasil → Lanjut dispatch! ✅

Langkah 8 — Insert Alert History
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO alert_history (alert_rule_id, value_at_trigger) VALUES (1, 38.5)
  → Trigger trg_alert_history_context OTOMATIS mengisi:
    • project_id ← dari alert_rules
    • device_id ← dari alert_rules
    • channel_id ← dari alert_rules
    • rule_snapshot ← {"operator":">","threshold_value":35.0,...} (JSONB)

Langkah 9 — Response ke Gateway
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend return: {
  "status": "success",
  "alert": {"triggered": true, "rule_id": 1, "history_id": 42}
}

Langkah 10 — Dashboard Tampilkan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend Gateway Monitor → Auto Refresh → Menampilkan log terbaru.
Alert Rules tab → Menampilkan alert history.
```

---

## 6. PANDUAN SETUP & INSTALASI

### 6.1 Prasyarat

| Software | Versi Minimum | Cek Versi |
|----------|---------------|-----------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | 2.30+ | `git --version` |
| Node.js (opsional, dev) | 18+ | `node --version` |
| Python (opsional, dev) | 3.10+ | `python --version` |

### 6.2 Instalasi Cepat (1 Menit)

```bash
# 1. Clone repository
git clone https://github.com/naufalln85/Telecom-Infra-Project.git
cd Telecom-Infra-Project

# 2. Salin dan isi environment variables
cp .env.example .env
# Edit .env → isi password yang kuat (atau gunakan default untuk demo)

# 3. Build & Jalankan seluruh stack
docker compose build
docker compose up -d

# 4. Tunggu sebentar, lalu cek status semua container
docker compose ps
```

**Hasil yang diharapkan (6 container RUNNING)**:
```
NAME               IMAGE                          STATUS              PORTS
tip_postgres       timescale/timescaledb-ha:pg15   Up (healthy)        5432
tip_redis          redis:7.2-alpine               Up (healthy)        6379
tip_backend        iot-platform-tip-backend        Up                  8000
tip_ai_serving     iot-platform-tip-ai-serving     Up                  8001
tip_frontend       iot-platform-tip-frontend       Up                  5173→80
tip_iot_gateway    iot-platform-tip-iot-gateway    Up (healthy)        3000, 1884, 5683
```

### 6.3 Inisialisasi Database

```bash
# Jalankan migrasi database Alembic
docker compose exec backend alembic upgrade head

# Atau seed data mock melalui API
curl -X POST http://localhost:8000/api/seed-mock
```

### 6.4 Verifikasi Instalasi

```bash
# Cek PostgreSQL
docker compose exec db psql -U tip_admin -d iot_platform_tip -c "\\dt"
# Harus ada 10 tabel

# Cek Redis
docker compose exec redis redis-cli -a x7TrLTJmZaRkPZpWzS3BD4Xl PING
# Harus: PONG

# Cek Backend API
curl http://localhost:8000/api/status
# Harus: {"postgres":{"status":"connected"}, "redis":{"status":"connected"}}

# Cek IoT Gateway
curl http://localhost:3000/health
# Harus: {"status":"healthy","protocol":"HTTP","port":3000,...}

# Cek Frontend
# Buka browser: http://localhost:5173
```

---

## 7. PANDUAN PENGGUNAAN APLIKASI

### 7.1 Akses Dashboard

| URL | Deskripsi |
|-----|-----------|
| `http://localhost:5173` | Frontend React Dashboard |
| `http://localhost:8000` | Backend FastAPI (Web Demo Modul A) |
| `http://localhost:8000/docs` | Swagger UI — Dokumentasi API Interaktif |
| `http://localhost:3000/health` | Health Check IoT Gateway |
| `http://localhost:8001` | AI Serving Module |

### 7.2 Registrasi & Login

1. Buka `http://localhost:5173`
2. Klik **"Login / Account"** di navbar
3. Tab **Register** → Isi email + password (min 8 karakter)
4. Atau gunakan akun demo:
   - Email: `pak-ahmad@example.com` / Password: `password_tes_123`
   - Email: `bu-siti@example.com` / Password: `password_tes_123`

### 7.3 Mengirim Data Telemetri via Gateway

#### Metode 1: Dari Dashboard (Test Panel)

1. Buka tab **Gateway** di Dashboard
2. Isi form **Test HTTP Ingestion**:
   - API Key: `key_greenhouse_123`
   - Device ID: `sensor-greenhouse-01`
   - Temperature: `38.5`
   - Humidity: `65`
3. Klik **"Kirim Data Test ke Gateway"**
4. Lihat hasilnya di log tabel sebelah kanan

#### Metode 2: Via curl (HTTP)

```bash
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{
    "device_id": "sensor-greenhouse-01",
    "temperature": 38.5,
    "humidity": 65.0
  }'
```

#### Metode 3: Via MQTT (mosquitto_pub)

```bash
# Install mosquitto-clients terlebih dahulu
mosquitto_pub \
  -h localhost -p 1884 \
  -t telemetry/data \
  -u "" -P "key_greenhouse_123" \
  -m '{"device_id":"sensor-01","temperature":30.5,"humidity":68}'
```

#### Metode 4: Via CoAP

```bash
coap-client -m post \
  coap://localhost:5683/telemetry \
  -O authorization,key_greenhouse_123 \
  -e '{"device_id":"sensor-01","temperature":30.5,"humidity":68}'
```

### 7.4 Monitoring Gateway

1. Buka tab **Gateway** di Dashboard
2. Aktifkan **"Auto Refresh"** untuk live monitoring (poll setiap 5 detik)
3. Lihat:
   - **Protocol Cards**: Jumlah pesan per protokol (HTTP/MQTT/CoAP)
   - **Stats Bar**: Total pesan, errors, breakdown per protokol
   - **Ingestion Log**: Tabel log data masuk terbaru
   - **Connection Guide**: Panduan koneksi device

### 7.5 Alert Rules & Notifikasi

1. Buka tab **Alert Rules** atau **Admin Panel**
2. Seed data mock → otomatis buat rule: `temperature > 35°C, cooldown 60s`
3. Kirim data suhu > 35°C via Gateway
4. Cek alert history — trigger otomatis mengisi `rule_snapshot` JSONB

### 7.6 Project Management (Multi-Tenant)

1. Klik **"Project: ..."** di navbar
2. **Switch Project**: Pilih proyek yang berbeda
3. **Create Project**: Buat proyek baru
4. **Delete Project**: Soft-delete (data tidak hilang)

---

## 8. SPESIFIKASI API LENGKAP

### 8.1 Authentication API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrasi akun baru, return JWT |
| POST | `/api/auth/login` | Login, return JWT |
| GET | `/api/auth/me` | Profil akun (perlu Bearer token) |

### 8.2 Projects API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/projects` | List semua proyek aktif |
| POST | `/api/v1/projects` | Buat proyek baru |
| DELETE | `/api/v1/projects/{id}` | Soft-delete proyek |

### 8.3 Devices & Channels API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/projects/{id}/devices` | List device per proyek |
| POST | `/api/v1/projects/{id}/devices` | Daftarkan device baru (generate API Key) |
| GET | `/api/v1/devices/{id}/channels` | List channel per device |
| POST | `/api/v1/devices/{id}/channels` | Buat channel baru |

### 8.4 Alert & Notification API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/v1/projects/{id}/rules` | List alert rules |
| GET | `/api/v1/projects/{id}/alerts/history` | Riwayat alert |
| GET | `/api/v1/projects/{id}/notifications/channels` | Notification channels |

### 8.5 Gateway Integration API ★ (Modul B)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| **POST** | **`/api/v1/save-data`** | **Penerima data dari IoT Gateway** |
| GET | `/api/v1/gateway/logs` | Log telemetri terbaru |
| GET | `/api/v1/gateway/stats` | Statistik per protokol |

**Detail POST `/api/v1/save-data`**:

Request Body (dari Gateway):
```json
{
  "protocol": "HTTP",
  "api_key": "key_greenhouse_123",
  "data": {
    "device_id": "sensor-01",
    "temperature": 28.5,
    "humidity": 65.0
  }
}
```

Response (sukses):
```json
{
  "status": "success",
  "protocol": "HTTP",
  "device": {
    "id": 1,
    "name": "Sensor Suhu Kebun",
    "project_id": 1
  },
  "data_received": {
    "device_id": "sensor-01",
    "temperature": 28.5,
    "humidity": 65.0
  },
  "alert": null,
  "message": "Data telemetri dari Sensor Suhu Kebun berhasil diterima via HTTP"
}
```

Response (alert triggered):
```json
{
  "status": "success",
  "alert": {
    "triggered": true,
    "rule_id": 1,
    "history_id": 42
  }
}
```

### 8.6 Demo & Admin API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/status` | Cek koneksi PostgreSQL & Redis |
| POST | `/api/seed-mock` | Seed data awal untuk demo |
| GET | `/api/dashboard-data` | Semua data dashboard |
| POST | `/api/simulate-telemetry` | Simulasi sensor (bypass gateway) |
| POST | `/api/soft-delete-project/{id}` | Soft-delete proyek + cascade |
| POST | `/api/reset-project/{id}` | Restore proyek |

### 8.7 Gateway Protocol Endpoints (Modul B — Node.js)

| Protokol | Port | Endpoint | Auth |
|----------|------|----------|------|
| HTTP | 3000 | `POST /api/v1/telemetry` | Header `x-api-key` |
| HTTP | 3000 | `GET /health` | — |
| MQTT | 1884 | Topic `telemetry/data` | Password = API Key |
| CoAP | 5683 | `POST /telemetry` | Header `authorization` |
| CoAP | 5683 | `GET /health` | — |

---

## 9. KONFIGURASI ENVIRONMENT

Semua konfigurasi disimpan di file `.env` (tidak di-commit ke Git).

### Variabel Utama

| Variabel | Default | Deskripsi |
|----------|---------|-----------|
| `POSTGRES_USER` | `tip_admin` | Username database |
| `POSTGRES_PASSWORD` | *(wajib diisi)* | Password database |
| `POSTGRES_DB` | `iot_platform_tip` | Nama database |
| `DATABASE_URL` | *(auto-compose)* | Connection string SQLAlchemy |
| `REDIS_PASSWORD` | *(wajib diisi)* | Password Redis |
| `REDIS_URL` | *(auto-compose)* | Connection string Redis |
| `SECRET_KEY` | *(wajib diisi)* | JWT signing key (hex 64 char) |
| `GATEWAY_HTTP_PORT` | `3000` | Port HTTP Gateway |
| `GATEWAY_MQTT_PORT` | `1884` | Port MQTT Gateway |
| `GATEWAY_COAP_PORT` | `5683` | Port CoAP Gateway |
| `BACKEND_URL` | `http://backend:8000/api/v1/save-data` | URL backend dari gateway |

### Generate Secret Key
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 10. PENGUJIAN & VERIFIKASI

### 10.1 Test End-to-End: HTTP Gateway → Backend → Alert

```bash
# 1. Pastikan semua container berjalan
docker compose ps

# 2. Seed mock data
curl -X POST http://localhost:8000/api/seed-mock

# 3. Kirim data suhu NORMAL (28°C, di bawah threshold 35°C)
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{"device_id":"sensor-01","temperature":28.0,"humidity":65}'
# Expected: success, alert = null

# 4. Kirim data suhu TINGGI (38.5°C, di atas threshold 35°C)
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{"device_id":"sensor-01","temperature":38.5,"humidity":65}'
# Expected: success, alert = triggered!

# 5. Kirim lagi LANGSUNG (harus kena cooldown)
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{"device_id":"sensor-01","temperature":40.0,"humidity":65}'
# Expected: success, alert = triggered + cooldown = true

# 6. Cek gateway logs
curl http://localhost:8000/api/v1/gateway/logs
# Expected: data masuk terlihat

# 7. Cek gateway stats
curl http://localhost:8000/api/v1/gateway/stats
# Expected: HTTP count = 3
```

### 10.2 Test API Key Invalid

```bash
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: api_key_yang_salah" \
  -d '{"device_id":"sensor-01","temperature":28.0,"humidity":65}'
# Expected: error 502 — backend reject karena API key tidak ditemukan di DB
```

### 10.3 Test Schema Validation

```bash
# Payload tanpa device_id (field wajib)
curl -X POST http://localhost:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{"temperature":28.0}'
# Expected: 400 — Invalid JSON Schema
```

### 10.4 Verifikasi Database (psql)

```bash
docker compose exec db psql -U tip_admin -d iot_platform_tip

-- Cek alert history dengan snapshot
SELECT id, alert_rule_id, value_at_trigger, rule_snapshot, triggered_at
FROM alert_history ORDER BY id DESC LIMIT 5;

-- Cek active alert rules view
SELECT * FROM active_alert_rules;

-- Cek devices & API key hash
SELECT id, name, api_key_hash, project_id FROM devices;
```

---

## 11. ARSITEKTUR DOCKER

### 11.1 Docker Compose Services (6 Containers)

```yaml
services:
  db:           # PostgreSQL 15 + TimescaleDB    → Port 5432
  redis:        # Redis 7 Alpine                 → Port 6379
  backend:      # FastAPI (Python 3.11)           → Port 8000
  ai-serving:   # AI ONNX Inference               → Port 8001
  frontend:     # React + Nginx                   → Port 5173
  iot-gateway:  # Node.js Gateway                 → Port 3000, 1884, 5683
```

### 11.2 Docker Network

Semua service terhubung via jaringan internal `tip_internal_net` (bridge driver):
- Service saling memanggil menggunakan **nama service** (bukan IP)
- Contoh: Gateway memanggil `http://backend:8000/api/v1/save-data`
- Dari luar Docker, akses melalui port mapping yang di-expose

### 11.3 Docker Volumes (Persistent Data)

| Volume | Mount Target | Fungsi |
|--------|-------------|--------|
| `tip_postgres_data` | `/home/postgres/pgdata/data` | Data PostgreSQL (persistent!) |
| `tip_redis_data` | `/data` | Data Redis AOF |

### 11.4 Health Checks

| Service | Check | Interval |
|---------|-------|----------|
| PostgreSQL | `pg_isready` | 10s |
| Redis | `redis-cli PING` | 10s |
| IoT Gateway | `wget /health` | 15s |

### 11.5 Dependency Chain

```
db (PostgreSQL) ← healthy
  └─ redis (Redis) ← healthy
       └─ backend (FastAPI) ← started
            ├─ ai-serving (AI Module)
            ├─ frontend (React Nginx)
            └─ iot-gateway (Node.js) ← started
```

---

## 12. TROUBLESHOOTING

### Container tidak mau start

```bash
# Lihat log container yang bermasalah
docker compose logs backend
docker compose logs iot-gateway
docker compose logs db

# Rebuild dari awal
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Gateway tidak bisa konek ke Backend

```bash
# Cek apakah backend sudah running
docker compose ps backend
# Pastikan BACKEND_URL di docker-compose.yml benar
# Harus: http://backend:8000/api/v1/save-data (bukan localhost!)

# Test dari dalam container gateway
docker compose exec iot-gateway wget -qO- http://backend:8000/api/status
```

### Database connection refused

```bash
# Cek apakah PostgreSQL sudah healthy
docker compose ps db

# Cek koneksi manual
docker compose exec db psql -U tip_admin -d iot_platform_tip -c "SELECT 1;"

# Pastikan .env sudah benar
grep DATABASE_URL .env
```

### Port sudah dipakai

```bash
# Cek port yang bentrok
netstat -tlnp | grep -E "3000|1884|5683|8000|5173|5432|6379"

# Ganti port di .env:
GATEWAY_HTTP_PORT=3001
GATEWAY_MQTT_PORT=1885
```

### Frontend tidak bisa akses Backend API

```bash
# Cek CORS sudah diaktifkan di backend (sudah ada di main.py)
# Pastikan allow_origins=["*"] atau URL frontend yang benar
```

### Redis COOLDOWN tidak berfungsi

```bash
# Cek Redis dari dalam container
docker compose exec redis redis-cli -a <REDIS_PASSWORD>
KEYS alert:cooldown:*
TTL alert:cooldown:1
```

---

## 📌 CATATAN PENTING

> **Keamanan Produksi**: File `.env` berisi password dan secret key. JANGAN commit ke Git! Sudah ada di `.gitignore`.

> **Data Mock**: Gunakan `POST /api/seed-mock` untuk mengisi data awal. API Key demo: `key_greenhouse_123` dan `key_smarthome_456`.

> **Skalabilitas**: Platform ini dirancang untuk di-scale horizontal. Di produksi, gunakan Docker Swarm atau Kubernetes untuk orchestration multi-node.

---

*Dokumen ini dibuat untuk mendukung presentasi dan pengembangan IoT Platform TIP oleh tim mahasiswa Modul A, B, C, dan D.*
