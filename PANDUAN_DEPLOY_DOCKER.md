# 🚀 Panduan Deploy & Rebuild Docker — IoT Platform TIP

Panduan lengkap untuk setup pertama kali maupun rebuild total di server VM/VPS.

---

## 📋 Prasyarat Server

```bash
# Pastikan sudah terinstall:
docker --version          # >= 24.x
docker compose version    # >= 2.x (bukan docker-compose lama)
git --version
```

---

## 1. Clone / Pull Repository

```bash
# Clone pertama kali
git clone https://github.com/naufalln85/Telecom-Infra-Project.git
cd Telecom-Infra-Project

# Atau jika sudah ada, pull yang terbaru
git pull origin main
```

---

## 2. Setup File `.env`

```bash
# Salin template environment
cp .env.example .env

# Edit dan isi nilai yang diperlukan (WAJIB)
nano .env
```

Nilai **WAJIB** yang harus diisi di `.env`:

| Variable | Keterangan |
|---|---|
| `POSTGRES_PASSWORD` | Password database PostgreSQL |
| `REDIS_PASSWORD` | Password Redis |
| `SECRET_KEY` | JWT secret key (generate dengan perintah di bawah) |

```bash
# Generate SECRET_KEY (copy output ke .env)
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 3. Build & Start Semua Service (Pertama Kali)

```bash
# Build semua image dan jalankan
docker compose up --build -d

# Pantau log semua service
docker compose logs -f

# Pantau log backend saja (untuk lihat progress migrasi & seed)
docker compose logs -f backend
```

> ⚠️ **Backend akan otomatis:**
> 1. Menunggu PostgreSQL siap (healthcheck)
> 2. Menjalankan `alembic upgrade head` (buat semua tabel)
> 3. Seed data awal (jika database kosong)
> 4. Start FastAPI server

---

## 4. Verifikasi Semua Service Berjalan

```bash
# Cek status semua container
docker compose ps

# Output yang diharapkan:
# tip_postgres    → healthy
# tip_redis       → healthy
# tip_backend     → running (port 8000)
# tip_frontend    → running (port 5173)
# tip_iot_gateway → running (port 3000, 1884, 5683)
# tip_ai_serving  → running (port 8001)
```

### Test endpoint:

```bash
# Backend health check
curl http://localhost:8000/api/status

# Frontend (buka di browser)
http://<IP_SERVER>:5173

# IoT Gateway health
curl http://localhost:3000/health

# API Docs (Swagger)
http://<IP_SERVER>:8000/docs
```

---

## 5. Rebuild Setelah Update Kode

### Rebuild semua service (setelah `git pull`):

```bash
git pull origin main
docker compose down
docker compose up --build -d
docker compose logs -f backend
```

### Rebuild hanya service tertentu (lebih cepat):

```bash
# Rebuild backend saja
docker compose stop backend
docker compose build backend
docker compose start backend
docker compose logs -f backend

# Rebuild frontend saja
docker compose stop frontend
docker compose build frontend
docker compose start frontend

# Rebuild gateway saja
docker compose stop iot-gateway
docker compose build iot-gateway
docker compose start iot-gateway
```

---

## 6. Manajemen Database

### Lihat status migrasi:

```bash
docker compose exec backend alembic -c /app/alembic.ini current
docker compose exec backend alembic -c /app/alembic.ini history
```

### Jalankan migrasi manual (jika diperlukan):

```bash
docker compose exec backend alembic -c /app/alembic.ini upgrade head
```

### Rollback migrasi:

```bash
# Rollback 1 langkah
docker compose exec backend alembic -c /app/alembic.ini downgrade -1

# Rollback semua (HATI-HATI! Data akan terhapus)
docker compose exec backend alembic -c /app/alembic.ini downgrade base
```

### Seed data ulang (reset manual):

```bash
# Masuk ke backend container
docker compose exec backend bash

# Jalankan seed via API (dari dalam container)
curl -X POST http://localhost:8000/api/seed-mock
```

### Akses psql langsung:

```bash
docker compose exec db psql -U tip_admin -d iot_platform_tip

# Contoh query:
\dt                          -- lihat semua tabel
SELECT * FROM accounts;      -- lihat akun
SELECT * FROM projects;      -- lihat project
SELECT * FROM devices;       -- lihat device
\q                           -- keluar
```

---

## 7. Reset Total (Fresh Install)

> ⚠️ **PERHATIAN:** Ini akan menghapus SEMUA data di database!

```bash
# Stop semua container
docker compose down

# Hapus volume database (data akan hilang semua!)
docker volume rm tip_postgres_data tip_redis_data

# Rebuild dari awal
docker compose up --build -d

# Backend akan otomatis buat ulang skema + seed data
docker compose logs -f backend
```

---

## 8. Monitor & Troubleshooting

### Cek log real-time:

```bash
docker compose logs -f                    # semua service
docker compose logs -f backend            # backend saja
docker compose logs -f frontend           # nginx frontend
docker compose logs -f iot-gateway        # gateway
docker compose logs -f db                 # postgresql
```

### Masuk ke dalam container:

```bash
docker compose exec backend bash         # Python/FastAPI shell
docker compose exec iot-gateway sh       # Node.js gateway shell
docker compose exec db psql -U tip_admin -d iot_platform_tip  # PostgreSQL
docker compose exec redis redis-cli -a <REDIS_PASSWORD>       # Redis CLI
```

### Cek resource usage:

```bash
docker stats
```

---

## 9. Akun Demo (Auto-Seed)

Setelah deploy pertama, akun berikut sudah tersedia:

| Email | Password | Tier |
|---|---|---|
| `pak-ahmad@example.com` | `password_tes_123` | free |
| `bu-siti@example.com` | `password_tes_123` | paid |

---

## 10. Port Summary

| Service | Port | Keterangan |
|---|---|---|
| Frontend | `:5173` | Dashboard UI (Colorful IoT Design) |
| Backend | `:8000` | FastAPI REST API + Swagger `/docs` |
| PostgreSQL | `:5432` | Database (hanya internal, bisa dibatasi firewall) |
| Redis | `:6379` | Cache & Event Bus (hanya internal) |
| AI Serving | `:8001` | ONNX Inference Engine |
| Gateway HTTP | `:3000` | HTTP Telemetry Ingestion |
| Gateway MQTT | `:1884` | MQTT Broker (Aedes) |
| Gateway CoAP | `:5683/udp` | CoAP Server |

---

## 11. Uji Kirim Data Telemetri ke Gateway

```bash
# HTTP (curl) — API Key dari device yang sudah di-seed
curl -X POST http://<IP_SERVER>:3000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: key_greenhouse_123" \
  -d '{"device_id":"sensor-01","temperature":28.5,"humidity":65.0}'

# Response sukses:
# {"status": "success", "protocol": "HTTP", ...}
```

---

*Generated by Antigravity — IoT Platform TIP, Telecom Infra Research Project*
