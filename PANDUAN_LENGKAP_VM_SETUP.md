# 🚀 Panduan Lengkap: Setup Database + Website Demo di VM Linux Ubuntu
## IoT Platform TIP — Modul A Infrastructure

> **Tujuan Panduan Ini**: Memandu kamu dari VM Ubuntu yang baru (fresh) hingga database PostgreSQL + TimescaleDB berjalan, skema ter-migrasi, dan website demo FastAPI bisa diakses dari browser untuk demonstrasi Database, API, Trigger, View, dan Redis Caching.

---

## 📋 Daftar Isi
1. [Prasyarat Sistem](#1-prasyarat-sistem)
2. [Transfer File ke VM](#2-transfer-file-ke-vm)
3. [Install Docker & Docker Compose](#3-install-docker--docker-compose)
4. [Install Python 3.10+](#4-install-python-310)
5. [Konfigurasi File `.env`](#5-konfigurasi-file-env)
6. [Jalankan Container Database & Redis](#6-jalankan-container-database--redis)
7. [Setup Python Virtual Environment](#7-setup-python-virtual-environment)
8. [Jalankan Migrasi Database (Alembic)](#8-jalankan-migrasi-database-alembic)
9. [Verifikasi Skema Database](#9-verifikasi-skema-database)
10. [Jalankan Website Demo FastAPI](#10-jalankan-website-demo-fastapi)
11. [Pengujian API via Terminal (curl)](#11-pengujian-api-via-terminal-curl)
12. [Demonstrasi Fitur Database via Web UI](#12-demonstrasi-fitur-database-via-web-ui)
13. [Monitoring & Troubleshooting](#13-monitoring--troubleshooting)
14. [Perintah Berguna Sehari-hari](#14-perintah-berguna-sehari-hari)

---

## 1. Prasyarat Sistem

### Spesifikasi Minimum VM
| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 / 24.04 LTS |
| RAM | 2 GB | 4 GB |
| CPU | 1 Core | 2 Core |
| Disk | 10 GB | 20 GB |
| Network | NAT/Bridged | Bridged (agar bisa diakses dari host) |

### Cek Koneksi Internet di VM
```bash
ping -c 3 google.com
```

---

## 2. Transfer File ke VM

Ada beberapa cara untuk memindahkan file project ke VM:

### Cara A: Menggunakan `git clone` (Direkomendasikan)
```bash
# Di VM, clone repository
git clone https://github.com/<username>/riset-telcome-infra.git
cd riset-telcome-infra
```

### Cara B: Menggunakan SCP dari Windows (PowerShell)
```powershell
# Jalankan di PowerShell Windows kamu
# Sesuaikan <VM_IP> dengan IP VM kamu
scp -r "D:\Project Lab\Riset_Telcome Infra Project" user@<VM_IP>:/home/user/iot-platform
```

### Cara C: Shared Folder (VMware/VirtualBox)
Jika menggunakan VMware/VirtualBox dengan shared folder, mount folder proyek ke VM:
```bash
# Setelah folder di-share, akses di VM (VMware)
ls /mnt/hgfs/

# Salin ke home directory agar lebih cepat
cp -r /mnt/hgfs/"Riset_Telcome Infra Project" ~/iot-platform
cd ~/iot-platform
```

### Cara D: Shared Folder Windows-Linux dengan SFTP (FileZilla)
Gunakan FileZilla di Windows → koneksi SFTP ke IP VM → seret folder project ke `/home/<user>/iot-platform/`.

---

Setelah file berhasil dipindahkan, **masuk ke direktori proyek**:
```bash
cd ~/iot-platform
# Atau sesuaikan dengan path tempat kamu menyimpan project
ls -la
```

Pastikan melihat struktur seperti ini:
```
.
├── docker-compose.yml
├── postgres/
│   ├── init.sql
│   └── postgresql.conf
├── db/
│   └── migrations/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│           ├── 001_hierarchy_auth.py
│           ├── 002_alerts_notifications.py
│           └── 003_triggers_views.py
├── demo_app/
│   ├── main.py
│   └── templates/
│       └── index.html
├── alembic.ini
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## 3. Install Docker & Docker Compose

### Langkah 3.1: Update package list
```bash
sudo apt update && sudo apt upgrade -y
```

### Langkah 3.2: Install dependensi apt
```bash
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common
```

### Langkah 3.3: Tambahkan GPG key Docker resmi
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

### Langkah 3.4: Tambahkan repository Docker
```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### Langkah 3.5: Install Docker Engine
```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Langkah 3.6: Tambahkan user ke group docker (agar tidak perlu `sudo` setiap saat)
```bash
sudo usermod -aG docker $USER

# PENTING: Logout dan login kembali agar perubahan group berlaku
# Atau gunakan perintah ini untuk sesi saat ini:
newgrp docker
```

### Langkah 3.7: Verifikasi instalasi
```bash
docker --version
# Output: Docker version 26.x.x, build ...

docker compose version
# Output: Docker Compose version v2.x.x

# Test jalankan container hello-world
docker run hello-world
```

---

## 4. Install Python 3.10+

### Ubuntu 22.04 (sudah punya Python 3.10 bawaan)
```bash
# Cek versi Python
python3 --version
# Output: Python 3.10.x atau lebih baru

# Install pip dan venv
sudo apt install -y python3-pip python3-venv python3-dev

# Verifikasi
pip3 --version
```

### Jika Python < 3.10 (Ubuntu 20.04)
```bash
# Tambahkan PPA deadsnakes
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3.11-distutils

# Set python3.11 sebagai default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

### Install build tools (untuk compile psycopg2)
```bash
sudo apt install -y gcc g++ libpq-dev build-essential
```

---

## 5. Konfigurasi File `.env`

### Langkah 5.1: Salin template `.env`
```bash
# Di direktori root project
cp .env.example .env
```

### Langkah 5.2: Generate Secret Key yang aman
```bash
# Generate random hex 64 karakter untuk SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"
# Simpan output ini!

# Generate password kuat untuk PostgreSQL
python3 -c "import secrets; print(secrets.token_urlsafe(24))"

# Generate password kuat untuk Redis
python3 -c "import secrets; print(secrets.token_urlsafe(20))"
```

### Langkah 5.3: Edit file `.env`
```bash
nano .env
```

Ubah nilai-nilai berikut (contoh konfigurasi untuk VM dengan FastAPI berjalan di VM, bukan di container):

```env
# ============================================================
# PostgreSQL
# ============================================================
POSTGRES_USER=tip_admin
POSTGRES_PASSWORD=Password_Kuat_Mu_Disini_123
POSTGRES_DB=iot_platform_tip
POSTGRES_HOST=db
POSTGRES_PORT=5432

# FastAPI berjalan langsung di VM (bukan dalam Docker),
# jadi gunakan 127.0.0.1 sebagai host (bukan 'db')
DATABASE_URL=postgresql+asyncpg://tip_admin:Password_Kuat_Mu_Disini_123@127.0.0.1:5432/iot_platform_tip
DATABASE_URL_SYNC=postgresql+psycopg2://tip_admin:Password_Kuat_Mu_Disini_123@127.0.0.1:5432/iot_platform_tip

# ============================================================
# Redis
# ============================================================
REDIS_PASSWORD=RedisPassword_Aman_456
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_MAXMEMORY=512mb

# FastAPI berjalan di VM, gunakan 127.0.0.1
REDIS_URL=redis://:RedisPassword_Aman_456@127.0.0.1:6379/0

# ============================================================
# JWT
# ============================================================
SECRET_KEY=HASIL_GENERATE_HEX_TADI_64_KARAKTER
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

# ============================================================
# App Settings
# ============================================================
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
SQLALCHEMY_ECHO=false
```

Simpan file (`Ctrl+O`, `Enter`, `Ctrl+X` untuk nano).

### Langkah 5.4: Verifikasi file `.env`
```bash
# Pastikan file tidak kosong dan variabel utama ada
grep -E "^(POSTGRES_|REDIS_|SECRET_KEY|DATABASE_URL)" .env
```

---

## 6. Jalankan Container Database & Redis

### Langkah 6.1: Pull image dan jalankan container
```bash
# Pastikan kamu di root direktori project
docker compose up -d
```

Output yang diharapkan:
```
[+] Running 3/3
 ✔ Network tip_internal_net    Created
 ✔ Container tip_postgres      Started
 ✔ Container tip_redis         Started
```

### Langkah 6.2: Tunggu container sehat (healthy)
```bash
# Cek status container (tunggu sampai status = Up (healthy))
watch docker compose ps
# Ctrl+C untuk keluar dari watch setelah status healthy
```

Atau cek manual setiap 5 detik:
```bash
docker compose ps
```

Status yang diharapkan:
```
NAME            IMAGE                          STATUS
tip_postgres    timescale/timescaledb-ha:...   Up (healthy)
tip_redis       redis:7.2-alpine               Up (healthy)
```

> **💡 Tips**: TimescaleDB butuh waktu ~30-60 detik pertama kali untuk inisialisasi ekstensi. Bersabar!

### Langkah 6.3: Verifikasi koneksi database
```bash
# Test koneksi PostgreSQL
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip -c "SELECT version();"

# Cek ekstensi aktif (timescaledb, pg_stat_statements, pgcrypto harus ada)
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "SELECT name, default_version, installed_version FROM pg_available_extensions WHERE installed_version IS NOT NULL ORDER BY name;"
```

Output ekstensi yang diharapkan:
```
         name          | default_version | installed_version
-----------------------+-----------------+------------------
 pgcrypto              | 1.3             | 1.3
 pg_stat_statements    | 1.10            | 1.10
 timescaledb           | 2.x.x           | 2.x.x
```

### Langkah 6.4: Verifikasi koneksi Redis
```bash
# Test koneksi Redis dengan password
docker exec -it tip_redis redis-cli -a "RedisPassword_Aman_456" PING
# Output: PONG

# Cek info Redis
docker exec -it tip_redis redis-cli -a "RedisPassword_Aman_456" INFO server | grep -E "redis_version|uptime"
```

---

## 7. Setup Python Virtual Environment

### Langkah 7.1: Buat virtual environment
```bash
# Di root direktori project
python3 -m venv .venv

# Verifikasi
ls -la .venv/
```

### Langkah 7.2: Aktifkan virtual environment
```bash
source .venv/bin/activate

# Prompt terminal berubah menjadi: (.venv) user@hostname:~/iot-platform$
```

### Langkah 7.3: Upgrade pip dan install dependensi
```bash
pip install --upgrade pip setuptools wheel

# Install semua dependensi project (FastAPI, SQLAlchemy, Alembic, Redis, dll.)
pip install -r requirements.txt
```

> **⚠️ Jika ada error psycopg2**: Pastikan `libpq-dev` sudah terinstall: `sudo apt install -y libpq-dev`

### Langkah 7.4: Verifikasi instalasi library
```bash
# Cek library penting sudah terinstall
pip list | grep -E "fastapi|uvicorn|sqlalchemy|alembic|psycopg2|redis|jose|passlib"
```

Output yang diharapkan:
```
alembic           1.x.x
fastapi           0.x.x
passlib           1.x.x
psycopg2-binary   2.x.x
python-jose       3.x.x
redis             5.x.x
SQLAlchemy        2.x.x
uvicorn           0.x.x
```

---

## 8. Jalankan Migrasi Database (Alembic)

Alembic akan membuat semua tabel, index, constraint, trigger, dan view secara berurutan.

### Langkah 8.1: Pastikan virtual environment aktif
```bash
# Harus ada (.venv) di depan prompt
which alembic
# Output: /home/user/iot-platform/.venv/bin/alembic
```

### Langkah 8.2: Cek konfigurasi Alembic
```bash
# Cek current state (seharusnya kosong / belum ada migrasi)
alembic current
```

### Langkah 8.3: Jalankan semua migrasi ke versi terbaru
```bash
alembic upgrade head
```

Output yang diharapkan (3 migrasi berurutan):
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transaction capable DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001_hierarchy_auth, Inisialisasi tabel hierarki dan autentikasi dasar.
INFO  [alembic.runtime.migration] Running upgrade 001_hierarchy_auth -> 002_alerts_notifications, Tambah tabel alert rules, notification channels, targets, dan history.
INFO  [alembic.runtime.migration] Running upgrade 002_alerts_notifications -> 003_triggers_views, Tambah trigger otomatis dan view untuk Alert Engine.
```

### Langkah 8.4: Verifikasi migrasi berhasil
```bash
# Cek versi current (harus 003_triggers_views)
alembic current

# Lihat history migrasi
alembic history --verbose
```

### Langkah 8.5: Cek tabel-tabel yang dibuat di database
```bash
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "\dt"
```

Daftar tabel yang harus muncul:
```
                   List of relations
 Schema |            Name             | Type  |   Owner
--------+-----------------------------+-------+-----------
 public | accounts                    | table | tip_admin
 public | alert_history               | table | tip_admin
 public | alert_rule_targets          | table | tip_admin
 public | alert_rules                 | table | tip_admin
 public | alembic_version             | table | tip_admin
 public | data_channels               | table | tip_admin
 public | devices                     | table | tip_admin
 public | notification_channels       | table | tip_admin
 public | project_members             | table | tip_admin
 public | projects                    | table | tip_admin
```

### Langkah 8.6: Cek Views yang dibuat
```bash
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "\dv"
```

Output yang diharapkan:
```
                List of relations
 Schema |          Name           | Type |   Owner
--------+-------------------------+------+-----------
 public | active_alert_rule_targets | view | tip_admin
 public | active_alert_rules       | view | tip_admin
```

### Langkah 8.7: Cek Trigger yang dibuat
```bash
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "SELECT trigger_name, event_manipulation, event_object_table, action_timing FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;"
```

Output yang diharapkan:
```
              trigger_name             | event_manipulation | event_object_table | action_timing
---------------------------------------+--------------------+--------------------+---------------
 trg_alert_history_context             | INSERT             | alert_history      | BEFORE
 trg_accounts_updated_at              | UPDATE             | accounts           | BEFORE
 trg_alert_rules_updated_at           | UPDATE             | alert_rules        | BEFORE
 trg_devices_updated_at               | UPDATE             | devices            | BEFORE
 trg_projects_soft_delete             | UPDATE             | projects           | AFTER
 trg_projects_updated_at              | UPDATE             | projects           | BEFORE
 ...
```

---

## 9. Verifikasi Skema Database

Jalankan skrip verifikasi otomatis untuk memastikan semua constraint, trigger, dan view berjalan 100%:

```bash
# Jalankan skrip verifikasi SQL
docker exec -i tip_postgres psql -U tip_admin -d iot_platform_tip \
  < "DB Relation/verify_schema.sql"
```

Jika semua berhasil, baris terakhir output adalah:
```
           status
-----------------------------
 Semua verifikasi skema berhasil.
(1 row)
```

Jika ada yang gagal, database akan melempar `EXCEPTION` dengan detail error yang menjelaskan apa yang bermasalah.

---

## 10. Jalankan Website Demo FastAPI

### Langkah 10.1: Pastikan virtual environment aktif
```bash
source .venv/bin/activate
```

### Langkah 10.2: Jalankan server Uvicorn
```bash
# Jalankan dari ROOT direktori project (bukan dari dalam demo_app/)
uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload
```

Output yang diharapkan:
```
INFO:     Will watch for changes in these directories: ['~/iot-platform']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using WatchFiles
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

> **Jika ada error RuntimeError: DATABASE_URL, REDIS_URL, atau SECRET_KEY tidak ditemukan**: Pastikan file `.env` ada di root direktori project dan variabel sudah terisi benar.

### Langkah 10.3: Akses Dashboard dari browser

**Jika akses dari dalam VM (GUI):**
```
http://127.0.0.1:8000
```

**Jika akses dari komputer Windows (host) ke VM:**
1. Cari IP VM terlebih dahulu:
   ```bash
   ip addr show | grep "inet " | grep -v "127.0.0.1"
   # Contoh output: inet 192.168.100.105/24
   ```
2. Pastikan port 8000 tidak diblokir firewall VM:
   ```bash
   sudo ufw status
   # Jika firewall aktif, izinkan port 8000:
   sudo ufw allow 8000/tcp
   ```
3. Akses dari browser Windows:
   ```
   http://192.168.100.105:8000
   ```

### Langkah 10.4: Akses Swagger UI (API Documentation Interaktif)
```
http://<IP_VM>:8000/docs
```
Swagger UI menampilkan semua endpoint API beserta form untuk mencoba langsung.

### Langkah 10.5: Jalankan sebagai background process (opsional, untuk demo)
```bash
# Jalankan di background agar terminal bebas dipakai
nohup uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &

# Lihat proses
ps aux | grep uvicorn

# Monitor log
tail -f server.log
```

---

## 11. Pengujian API via Terminal (curl)

Jalankan semua perintah berikut dari terminal VM (atau terminal Windows dengan IP VM).

### Test 1: Cek Status Koneksi Database & Redis
```bash
curl -s http://127.0.0.1:8000/api/status | python3 -m json.tool
```

**Output yang diharapkan:**
```json
{
    "postgres": {
        "status": "connected",
        "details": ""
    },
    "redis": {
        "status": "connected",
        "details": ""
    }
}
```

### Test 2: Seed Data Mock (Populate Database)
```bash
curl -s -X POST http://127.0.0.1:8000/api/seed-mock | python3 -m json.tool
```

**Output yang diharapkan:**
```json
{
    "status": "success",
    "message": "Database berhasil di-seed dengan data mock."
}
```

### Test 3: Register Akun Baru (JWT Auth)
```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"password_tes_123","tier":"free"}' \
  | python3 -m json.tool
```

**Output yang diharapkan:**
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600
}
```

### Test 4: Login dan Ambil JWT Token
```bash
# Simpan response login ke variabel
LOGIN_RESPONSE=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"password_tes_123"}')

echo $LOGIN_RESPONSE | python3 -m json.tool

# Ekstrak token ke variabel
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token: $TOKEN"
```

### Test 5: Akses Endpoint Terproteksi (Bearer Token)
```bash
curl -s http://127.0.0.1:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**Output yang diharapkan:**
```json
{
    "id": 3,
    "email": "tester@example.com",
    "tier": "free",
    "created_at": "2026-07-20T07:15:00+00:00"
}
```

### Test 6: Ambil Data Dashboard (Semua Tabel)
```bash
curl -s http://127.0.0.1:8000/api/dashboard-data | python3 -m json.tool
```

### Test 7: Simulasi Sensor (Trigger Alert)
```bash
# Kirim suhu 38.5°C (melebihi threshold 35°C → harus TRIGGERED)
curl -s -X POST http://127.0.0.1:8000/api/simulate-telemetry \
  -H "Content-Type: application/json" \
  -d '{"device_id":1,"channel_name":"temperature","value":38.5}' \
  | python3 -m json.tool
```

**Output yang diharapkan (Alert terpicu pertama kali):**
```json
{
    "matched": true,
    "rule_id": 1,
    "triggered": true,
    "cooldown": false,
    "action": "dispatched",
    "history": {
        "id": 1,
        "project_id": 1,
        "device_id": 1,
        "channel_id": 1,
        "rule_snapshot": {"operator": ">", "threshold_value": 35.0, ...}
    },
    "message": "ALERT BERHASIL TRIGGERED & DISPATCHED! ..."
}
```

### Test 8: Simulasi Cooldown Redis (Anti-Spam)
```bash
# Kirim lagi SEGERA SETELAH Test 7 (dalam 60 detik)
curl -s -X POST http://127.0.0.1:8000/api/simulate-telemetry \
  -H "Content-Type: application/json" \
  -d '{"device_id":1,"channel_name":"temperature","value":38.5}' \
  | python3 -m json.tool
```

**Output yang diharapkan (COOLDOWN aktif):**
```json
{
    "matched": true,
    "rule_id": 1,
    "triggered": true,
    "cooldown": true,
    "action": "ignored_cooldown",
    "ttl_left_seconds": 58,
    "message": "Alert terpicu (38.5 > 35.0), tetapi diabaikan karena masih COOLDOWN. Sisa waktu: 58 detik."
}
```

### Test 9: Soft Delete Proyek (Cascade Trigger)
```bash
# Soft delete Proyek 1
curl -s -X POST http://127.0.0.1:8000/api/soft-delete-project/1 \
  | python3 -m json.tool

# Cek di database langsung
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "SELECT id, name, deleted_at FROM projects;"

# Cek device ikut ter-soft-delete
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip \
  -c "SELECT id, name, deleted_at FROM devices;"
```

### Test 10: Restore Proyek
```bash
curl -s -X POST http://127.0.0.1:8000/api/reset-project/1 \
  | python3 -m json.tool
```

### Test 11: Uji Partial Unique Index Email
```bash
# Coba daftar email yang sudah ada (harus DITOLAK)
curl -s -X POST http://127.0.0.1:8000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"pak-ahmad@example.com","password":"test12345","tier":"free"}' \
  | python3 -m json.tool

# Soft delete akun Ahmad (ID 1)
curl -s -X POST http://127.0.0.1:8000/api/accounts/soft-delete/1 \
  | python3 -m json.tool

# Coba daftar lagi email yang SAMA (sekarang harus BERHASIL karena akun lama sudah terhapus)
curl -s -X POST http://127.0.0.1:8000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"pak-ahmad@example.com","password":"test12345","tier":"free"}' \
  | python3 -m json.tool
```

---

## 12. Demonstrasi Fitur Database via Web UI

Buka browser dan akses `http://<IP_VM>:8000`. Dashboard akan menampilkan interface dark mode dengan berbagai kontrol.

### Skenario A: Seed Data Mock
1. Klik tombol **"🌱 Seed Data Mock"** di panel kiri atas
2. Amati konsol log di bawah — status sukses muncul hijau
3. Klik **"🔄 Refresh"** pada panel kanan
4. Jelajahi tab: `accounts`, `projects`, `devices`, `data_channels`, `alert_rules`

### Skenario B: View Active Alert Rules
1. Klik tab **"active_rules (View)"** di panel kanan
2. Terlihat 1 rule aktif: Sensor Suhu Kebun temperature > 35°C
3. View ini secara transparan memfilter JOIN 4 tabel berbeda

### Skenario C: Trigger Alert + Snapshot JSONB
1. Pada form **"Sensor Telemetry Simulator"**:
   - Device: `Sensor Suhu Kebun (Device 1)`
   - Channel: `temperature`
   - Nilai: `38.5`
2. Klik **"⚡ Kirim & Evaluasi"**
3. Lihat konsol log → **ALERT BERHASIL TRIGGERED!**
4. Buka tab **"alert_history"** → lihat baris baru dengan kolom **Snapshot (Trigger)** berisi JSON — ini diisi otomatis oleh trigger PL/pgSQL `trg_alert_history_context`

### Skenario D: Redis Cooldown (Anti-Spam)
1. Segera klik lagi **"⚡ Kirim & Evaluasi"** dengan nilai sama (38.5)
2. Konsol log berubah **kuning/warning** → "masih COOLDOWN. Sisa waktu: XX detik"
3. Cooldown 60 detik aktif via Redis TTL (key `alert:cooldown:1`)

### Skenario E: Cascade Soft Delete via Trigger
1. Klik tombol **"🗑️ Soft Delete Proyek 1"**
2. Klik **Refresh** → lihat tab `projects`: kolom `deleted_at` terisi
3. Lihat tab `devices`: Device 1 juga ter-soft-delete otomatis (trigger cascade!)
4. Lihat tab **"active_rules (View)"**: rule alarm Proyek 1 HILANG dari daftar aktif
5. Klik **"♻️ Restore Proyek 1"** untuk mengembalikan ke aktif

### Skenario F: Partial Unique Index Email
1. Pada form **"Uji Partial Unique Index Email Akun"**
2. Email: `pak-ahmad@example.com` → Klik **"Coba Daftar"**
3. Error merah: "Email tersebut sudah terdaftar dan berstatus AKTIF"
4. Klik **"Soft Delete Akun 1 (Ahmad)"**
5. Klik lagi **"Coba Daftar"** → **Berhasil!**
6. Ini membuktikan: partial unique index hanya berlaku untuk akun AKTIF (deleted_at IS NULL)

---

## 13. Monitoring & Troubleshooting

### Cek Status Container
```bash
docker compose ps
docker stats tip_postgres tip_redis
```

### Monitor Log Container
```bash
# Log PostgreSQL
docker compose logs -f db

# Log Redis
docker compose logs -f redis

# Log semua container
docker compose logs -f
```

### Masuk ke PostgreSQL CLI
```bash
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip
```

Perintah SQL berguna di dalam psql:
```sql
-- Lihat semua tabel
\dt

-- Lihat semua view
\dv

-- Lihat semua trigger
\dy

-- Deskripsi tabel accounts
\d accounts

-- Keluar
\q
```

### Cek Slow Queries (pg_stat_statements)
```bash
docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip -c "
SELECT
    left(query, 80) AS query_snippet,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS avg_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;"
```

### Monitor Redis Keys
```bash
# Lihat semua key (termasuk cooldown key)
docker exec -it tip_redis redis-cli -a "RedisPassword_Aman_456" KEYS "*"

# Cek TTL cooldown key
docker exec -it tip_redis redis-cli -a "RedisPassword_Aman_456" TTL "alert:cooldown:1"
```

### Troubleshooting Umum

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| Container tidak healthy | Image belum selesai download | Tunggu, `docker compose logs db` |
| `alembic upgrade` gagal | DATABASE_URL_SYNC salah | Cek `.env`, gunakan `127.0.0.1` bukan `db` |
| `uvicorn` error RuntimeError | `.env` tidak ditemukan | Jalankan dari root project, bukan dari `demo_app/` |
| FastAPI tidak bisa connect DB | Port 5432 tidak expose | Cek `docker compose ps`, pastikan port `0.0.0.0:5432->5432` |
| Redis error | Password salah | Cek `REDIS_URL` di `.env` sesuai dengan `REDIS_PASSWORD` |
| Browser tidak bisa akses | Firewall VM | `sudo ufw allow 8000/tcp` |
| psycopg2 install error | `libpq-dev` belum ada | `sudo apt install libpq-dev` |

---

## 14. Perintah Berguna Sehari-hari

### Start/Stop Stack
```bash
# Mulai semua container
docker compose up -d

# Stop semua container (data tetap aman)
docker compose stop

# Stop dan hapus container (data tetap aman di volume)
docker compose down

# HATI-HATI: Stop + hapus semua data (RESET TOTAL)
docker compose down -v
```

### Restart FastAPI Server
```bash
# Ctrl+C untuk stop, lalu jalankan lagi:
source .venv/bin/activate
uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Reset Database ke State Awal
```bash
# 1. Stop container dan hapus volume
docker compose down -v

# 2. Jalankan ulang (fresh)
docker compose up -d

# 3. Tunggu healthy, lalu migrate ulang
alembic upgrade head
```

### Rollback Migrasi (jika perlu)
```bash
# Kembali ke versi sebelumnya
alembic downgrade -1

# Kembali ke awal (hapus semua)
alembic downgrade base
```

### Update Kode dan Restart
```bash
# Pull update terbaru dari git
git pull

# Restart FastAPI (jika tidak pakai --reload)
pkill -f uvicorn
uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## ✅ Ringkasan Urutan Eksekusi

```
1. Transfer file project ke VM
2. sudo apt update && install docker
3. newgrp docker  ← agar tidak perlu sudo
4. docker compose up -d  ← start PostgreSQL + Redis
5. Watch: docker compose ps  ← tunggu (healthy)
6. python3 -m venv .venv && source .venv/bin/activate
7. pip install -r requirements.txt
8. cp .env.example .env && nano .env  ← isi password & secret key
9. alembic upgrade head  ← buat semua tabel, trigger, view
10. uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload
11. Buka browser: http://<IP_VM>:8000
12. Klik "Seed Data Mock" → mulai demonstrasi
```

---

*Panduan ini dibuat untuk project IoT Platform TIP — Modul A Infrastructure*
*Stack: FastAPI + PostgreSQL 15 + TimescaleDB + Redis 7 + Alembic*

Tentu, mari kita bahas kedua hal tersebut dengan detail agar Anda siap untuk menjelaskannya saat presentasi!

1. Penjelasan Stack Teknologi & Mengapa Dipilih
Inilah alasan utama di balik pemilihan stack teknologi pada Modul A. Ini sangat bagus untuk ditunjukkan kepada audiens untuk membuktikan bahwa arsitektur yang Anda bangun siap untuk production (skala besar):

A. PostgreSQL 15 + TimescaleDB
PostgreSQL 15: Berperan sebagai database relasional utama. Kita menggunakan versi 15 karena sangat stabil dan mendukung semua fitur modern seperti JSONB (untuk menyimpan konfigurasi dinamis) dan Partial Index (untuk memastikan email unik hanya pada akun yang aktif).
TimescaleDB (Ekstensi): IoT selalu berurusan dengan data Time-Series (data runtun waktu seperti suhu tiap detik). TimescaleDB mengubah PostgreSQL biasa menjadi database time-series super cepat.
Mengapa Dieksekusi? Daripada menggunakan dua database terpisah (misal: MySQL untuk relasi + InfluxDB untuk sensor), kita menyatukannya di PostgreSQL + TimescaleDB. Ini membuat sistem lebih mudah di-maintain, query JOIN bisa dilakukan secara langsung, dan konsistensi data lebih terjamin.
B. Redis 7
Fungsi 1 (Cache Autentikasi): Setiap detik, ribuan sensor akan mengirim data. Jika kita mengecek API Key ke PostgreSQL setiap detik, database akan kelebihan beban (overload). Redis bertindak sebagai cache (penyimpanan di memori RAM yang super cepat) untuk menyimpan status autentikasi perangkat.
Fungsi 2 (Anti-Spam Cooldown): Jika sensor suhu melebihi batas, alert akan terpicu. Tanpa Redis, sistem bisa mengirim ribuan email notifikasi dalam semenit. Kita menggunakan fitur TTL (Time-to-Live) Redis untuk memberikan cooldown (misal: jeda 5 menit sebelum alert berikutnya dikirim).
Mengapa Dieksekusi? Kecepatan dan perlindungan dari Spam/Overload. Redis merespons dalam hitungan milidetik.
C. FastAPI + Alembic
FastAPI: Framework Python modern untuk membuat REST API. Sangat cepat (mendekati NodeJS dan Go) dan otomatis menghasilkan dokumentasi API (Swagger UI).
Alembic: Tool untuk Database Migration.
Mengapa Dieksekusi? Di dunia nyata, struktur database sering berubah (tambah tabel, tambah kolom). Tanpa Alembic, mengubah skema database secara manual sangat berisiko. Alembic memungkinkan kita melakukan "version control" untuk skema database, sehingga jika ada kesalahan (bug), kita bisa me-rollback database ke versi sebelumnya dengan aman.
2. Apakah Auth Dasar (Login, Register, Logout) Sudah Tercakup?
Ya, sepenuhnya tercakup!

Berdasarkan dokumen spesifikasi API (api_spec.md), kita memiliki sistem autentikasi modern berbasis JWT (JSON Web Token):

Register (POST /api/v1/auth/register): Membuat akun baru. Password otomatis dienkripsi (di-hash) menggunakan algoritma bcrypt sebelum disimpan ke database (tidak ada password plain-text).
Login (POST /api/v1/auth/login): Memverifikasi email dan password, lalu menghasilkan Token JWT yang digunakan sebagai "kunci akses" ke API lainnya.
Logout: Pada arsitektur JWT stateless, proses logout biasanya dilakukan di sisi Frontend (Klien) dengan cara menghapus Token JWT dari penyimpanan lokal (Local Storage/Cookies).
(Nilai plus untuk presentasi: Berkat fitur Partial Index di database, jika akun "Budi" dihapus (Soft Delete), ada orang lain bernama "Budi" yang bisa mendaftar ulang dengan email yang sama tanpa menyebabkan bentrok di database).

3. API Apa Saja yang Tersedia Selain Auth?
Sistem ini sudah memiliki ekosistem API yang sangat lengkap untuk mengelola seluruh platform IoT. Berikut adalah kelompok API utamanya:

A. Manajemen Proyek (Tenant)
Buat Proyek Baru (POST /api/v1/projects)
Lihat Daftar Proyek (GET /api/v1/projects)
Ubah Nama Proyek (PUT /api/v1/projects/{projectId})
Hapus Proyek (Soft Delete) (DELETE /api/v1/projects/{projectId}) -> Ingat, trigger database otomatis akan men-soft-delete semua perangkat di dalam proyek ini juga!
B. Manajemen Perangkat & Sensor (Devices & Channels)
Daftar Perangkat Baru (POST /api/v1/projects/{projectId}/devices) -> Mengembalikan API Key.
Lihat Perangkat (GET /api/v1/projects/{projectId}/devices)
Hapus Perangkat (DELETE /api/v1/projects/{projectId}/devices/{deviceId})
Tambah Sensor/Channel ke Perangkat (POST /api/v1/devices/{deviceId}/channels) -> Misal: Sensor Suhu, Sensor Kelembapan.
Lihat Daftar Sensor Perangkat (GET /api/v1/devices/{deviceId}/channels)
C. Manajemen Notifikasi (Notification Channels)
Tambah Saluran Notif (POST /api/v1/projects/{projectId}/notifications/channels) -> Mendukung Telegram, Email, Webhook.
Hapus Saluran Notif (DELETE /api/v1/projects/{projectId}/notifications/channels/{channelId})
D. Mesin Peringatan Dini (Alert Rules & History)
Buat Aturan Alarm (POST /api/v1/projects/{projectId}/rules) -> Misal: "Jika Suhu > 35 derajat, kirim ke Telegram, cooldown 5 menit".
Lihat Aturan Aktif (GET /api/v1/projects/{projectId}/rules)
Matikan/Nyalakan Aturan (PATCH /api/v1/projects/{projectId}/rules/{ruleId})
Lihat Riwayat Alarm (GET /api/v1/projects/{projectId}/alerts/history) -> Menampilkan histori kapan saja alarm pernah berbunyi, anti-manipulasi berkat trigger.
Jika saat presentasi mereka bertanya, "Bagaimana cara Modul Dashboard (Modul C) menampilkan data?", Anda bisa menjawab: "Cukup panggil API GET kami, dan datanya sudah dikembalikan dalam format JSON yang bersih dan tervalidasi secara relasional!"