# 📊 Walkthrough Presentasi — IoT Platform TIP Modul A
## Database Infrastructure: PostgreSQL + TimescaleDB + Redis

> **Untuk Presentasi Hari Ini** — Dokumen ini merangkum semua yang telah dibangun, mengapa dibangun demikian, dan bagaimana cara mendemonstrasikannya secara langsung.

---

## 🗂️ INVENTARIS FILE PROYEK

Berikut semua file yang telah dibuat dan fungsinya:

### 📁 Root Directory

| File | Ukuran | Fungsi | Perlu Dipresentasikan? |
|------|--------|--------|----------------------|
| `docker-compose.yml` | 5.7 KB | Mendefinisikan dan menjalankan stack infrastruktur (PostgreSQL + Redis) dalam container terisolasi | ✅ Ya — tunjukkan stack-nya |
| `.env.example` | 5.3 KB | Template variabel konfigurasi rahasia (password, secret key, URL koneksi) | ✅ Ya — jelaskan mengapa .env tidak di-commit ke git |
| `.gitignore` | 671 B | Mencegah file sensitif (.env, .venv) masuk ke git repository | ℹ️ Opsional |
| `alembic.ini` | 2.4 KB | Konfigurasi tool migrasi database (Alembic) — menentukan lokasi script migrasi | ✅ Ya — jelaskan konsep migrasi |
| `requirements.txt` | 4.0 KB | Daftar seluruh library Python yang dibutuhkan (FastAPI, SQLAlchemy, Alembic, Redis, dll.) | ℹ️ Opsional |
| `setup_vm.sh` | 12 KB | **Script otomatis** instalasi satu-klik seluruh infrastruktur di VM Ubuntu | ✅ Ya — ini nilai tambah besar! |
| `PANDUAN_LENGKAP_VM_SETUP.md` | 28 KB | Panduan langkah-demi-langkah setup VM dari nol hingga demo berjalan | ✅ Ya — tunjukkan sebagai dokumentasi operasional |

### 📁 `postgres/` — Konfigurasi Database

| File | Fungsi | Mengapa Perlu? |
|------|--------|----------------|
| `init.sql` | Dieksekusi otomatis saat container PostgreSQL pertama kali dibuat. Mengaktifkan ekstensi TimescaleDB, pg_stat_statements, dan pgcrypto | Memastikan ekstensi aktif bahkan sebelum aplikasi berjalan |
| `postgresql.conf` | Tuning parameter produksi: `shared_buffers`, `work_mem`, `max_connections`, `listen_addresses`, logging slow query, timezone | Menggantikan konfigurasi default PostgreSQL yang tidak optimal |

### 📁 `db/migrations/versions/` — Migrasi Skema Database

| File | Isi | Urutan |
|------|-----|--------|
| `001_hierarchy_auth.py` | Membuat tabel: `accounts`, `projects`, `project_members`, `devices`, `data_channels` | 1️⃣ Pertama |
| `002_alerts_notifications.py` | Membuat tabel: `alert_rules`, `notification_channels`, `alert_rule_targets`, `alert_history` | 2️⃣ Kedua |
| `003_triggers_views.py` | Membuat semua trigger PL/pgSQL, VIEW `active_alert_rules`, dan semua index | 3️⃣ Ketiga |

### 📁 `demo_app/` — Aplikasi Demo Web

| File | Fungsi |
|------|--------|
| `main.py` | Backend FastAPI: 15+ endpoint API (auth JWT, seed data, simulasi sensor, soft-delete, dll.) |
| `templates/index.html` | Frontend dashboard interaktif dengan dark mode glassmorphism |

### 📁 `DB Relation/` — Spesifikasi & Verifikasi

| File | Fungsi | Untuk Presentasi |
|------|--------|-----------------|
| `schema_modul_a.sql` | SQL DDL lengkap seluruh skema dalam satu file | ✅ Tunjukkan kode SQL trigger & view |
| `verify_schema.sql` | Script SQL otomatis untuk memverifikasi semua constraint & trigger berjalan | ✅ Demo langsung di psql! |
| `alert_flow.md` | Diagram alur Alert Engine dari sensor masuk hingga notifikasi dikirim | ✅ Jelaskan alur bisnis |
| `api_spec.md` | Spesifikasi lengkap semua endpoint REST API | ✅ Referensi integrasi modul lain |
| `device_api_key_spec.md` | Spesifikasi autentikasi perangkat IoT dengan SHA-256 API Key | ✅ Koordinasi dengan Modul B |

### 📁 `Dokumentasi/`

| File | Fungsi |
|------|--------|
| `Dokumentasi Project IOT Platform_TIP.md` | Dokumentasi teknis lengkap seluruh proyek |
| `panduan_presentasi_db.md` | Panduan penjelasan mendalam arsitektur & analogi |
| `project_analysis.md` | Analisis desain dan keputusan teknis |

### 📁 `Flow DB Relation/`

| File | Fungsi |
|------|--------|
| `db_relation_flow_1783793763413.png` | **Diagram ERD visual** relasi antar tabel |
| `erd_modul_a.drawio` | Source diagram ERD (bisa diedit di draw.io) |
| `iot_platform_rapi.drawio` | Diagram arsitektur sistem IoT platform lengkap |

---

## 🎯 URUTAN PRESENTASI YANG DISARANKAN

### Bagian 1 — Konteks & Arsitektur (5 menit)
**Tunjukkan**: Diagram ERD (`db_relation_flow_1783793763413.png`)

> "Sistem IoT Platform TIP Modul A adalah infrastruktur database untuk platform IoT multi-tenant. Analoginya seperti **Co-Working Space**: setiap `project` adalah ruangan kantor yang disewa user (`account`). Di dalam ruangan dipasang perangkat sensor (`device`) dengan berbagai kanal data (`data_channel`). Sistem alarm (`alert_rule`) memantau sensor dan mengirim notifikasi jika ada anomali."

**Stack yang digunakan:**
- **PostgreSQL 15 + TimescaleDB** → Database utama + ekstensi time-series
- **Redis 7** → Cache autentikasi device + Anti-spam cooldown alert
- **FastAPI + Alembic** → API backend + manajemen migrasi skema

---

### Bagian 2 — Mengapa Keputusan Desain Ini? (10 menit)

#### 🔐 A. Foreign Key Komposit — Tenant Boundary Enforcement
**Kode**: `schema_modul_a.sql` baris FK komposit di `alert_rules`
```sql
-- Di tabel alert_rules:
FOREIGN KEY (device_id, project_id) REFERENCES devices(id, project_id)
```
**Mengapa?** Mencegah kebocoran data lintas-tenant (*cross-tenant data leak*) di level database — bukan di level aplikasi yang rentan bug. Jika ada bug di backend, database tetap menolak data kotor.

**Demo langsung**:
```sql
-- Ini akan DITOLAK oleh PostgreSQL:
INSERT INTO alert_rules (project_id, device_id, ...) VALUES (1, 2, ...);
-- device_id=2 milik project_id=2, bukan project_id=1!
-- ERROR: insert or update violates foreign key constraint
```

---

#### 📸 B. Trigger `trg_alert_history_context` — Immutable Audit Trail
**Kode**: `003_triggers_views.py`

**Mengapa?** Di produksi nyata, riwayat alarm adalah **bukti hukum dan audit compliance**. Jika pengguna menghapus aturan alarm, riwayat kapan alarm pernah berbunyi tidak boleh hilang.

**Solusinya**: Trigger menyalin "foto" kondisi aturan ke kolom JSONB `rule_snapshot` saat alarm dipicu. Meskipun aturan dihapus, foto tetap ada.

**Demo langsung (hasil yang sudah terbukti tadi)**:
```
Input ke database: hanya 2 kolom (alert_rule_id, value_at_trigger)
Output dari trigger: 5 kolom terisi otomatis!
rule_snapshot: {"operator": ">", "channel_name": "temperature", 
                "threshold_value": 35.0, "cooldown_seconds": 60}
```

---

#### 🗑️ C. Trigger `trg_projects_soft_delete` — Cascade Otomatis
**Mengapa?** Di framework backend biasa, menghapus proyek berarti menembak puluhan query UPDATE secara berurutan dari aplikasi. Ini lambat dan rentan gagal di tengah jalan (meninggalkan *orphan data*).

**Solusinya**: Trigger database menjalankan cascade dalam satu transaksi atomik — jika gagal, semua dibatalkan.

**Demo langsung (hasil yang sudah terbukti tadi)**:
```
UPDATE projects SET deleted_at = now() WHERE id = 1;
→ Devices otomatis ter-soft-delete ✅
→ Alert rules otomatis is_active = false ✅
→ VIEW active_alert_rules langsung kosong ✅
Semua dalam 1 query, 1 transaksi!
```

---

#### 📧 D. Partial Unique Index — Email Unik untuk Akun Aktif
**Kode**:
```sql
CREATE UNIQUE INDEX uq_accounts_active_email
ON accounts (lower(email))
WHERE deleted_at IS NULL;
```
**Mengapa?** Di produksi, pengguna yang akun lamanya dihapus harus bisa mendaftar ulang dengan email yang sama. Index biasa tidak bisa membedakan akun aktif dan yang sudah dihapus.

**Demo langsung (hasil yang sudah terbukti tadi)**:
```
INSERT email yang sama saat aktif → ERROR: duplicate key ✅
Soft-delete akun → INSERT email sama → BERHASIL ✅
```

---

#### ⏱️ E. Redis TTL — Anti-Spam Cooldown Alert
**Mengapa?** Sensor IoT bisa mengirim data ratusan kali per menit. Tanpa cooldown, satu threshold violation bisa menghasilkan ratusan notifikasi Telegram dalam hitungan menit → spam!

**Solusinya**: Setiap kali alert berhasil terkirim, Redis menyimpan key `alert:cooldown:{rule_id}` dengan TTL = `cooldown_seconds`. Selama key ini ada, alert berikutnya diabaikan.

**Demo via API** (setelah server berjalan):
```bash
curl -X POST http://IP_VM:8000/api/simulate-telemetry \
  -d '{"device_id":1,"channel_name":"temperature","value":38.5}'
# Response pertama: "ALERT BERHASIL TRIGGERED & DISPATCHED!"

# Langsung kirim lagi:
curl -X POST http://IP_VM:8000/api/simulate-telemetry \
  -d '{"device_id":1,"channel_name":"temperature","value":38.5}'
# Response kedua: "masih COOLDOWN. Sisa waktu: 58 detik."
```

---

### Bagian 3 — Demo Langsung (15 menit)

#### Demo A: Via Web Dashboard
```
1. Buka browser: http://10.10.10.2:8000
2. Klik "Seed Data Mock" → database terisi
3. Eksplorasi tab: accounts, projects, devices, alert_rules, active_alert_rules (View)
4. Kirim sensor suhu 38.5°C → Alert triggered!
5. Kirim lagi → Cooldown Redis aktif!
6. Soft Delete Proyek 1 → Lihat cascade di tab devices & active_rules
7. Restore Proyek 1 → Kembali normal
```

#### Demo B: Via psql Langsung di Database
```bash
sudo docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip
```
Jalankan query dari **Verifikasi 1–8** yang sudah terbukti berhasil tadi.

#### Demo C: Via Swagger UI (Dokumentasi API Interaktif)
```
Buka: http://10.10.10.2:8000/docs
→ Tunjukkan semua endpoint API tersedia
→ Coba langsung register user baru dari Swagger UI
→ Login dan ambil JWT token
→ Gunakan token untuk akses endpoint /api/auth/me
```

---

### Bagian 4 — Infrastruktur & DevOps (5 menit)

**Tunjukkan**: `docker-compose.yml` dan `setup_vm.sh`

```bash
# Tunjukkan bahwa seluruh setup hanya butuh 1 perintah:
./setup_vm.sh

# Dan cek status container:
sudo docker compose ps
sudo docker stats tip_postgres tip_redis
```

**Nilai lebih yang bisa dipresentasikan:**
- Health check otomatis di docker-compose
- Persistent volume (data tidak hilang meski container restart)
- Network isolation (container tidak bisa diakses dari luar jaringan internal)
- Logging dengan rotasi file (max 50MB per file, 5 file)

---

### Bagian 5 — Rencana Integrasi Lintas Modul (5 menit)

**Tunjukkan**: `DB Relation/api_spec.md` dan `DB Relation/device_api_key_spec.md`

| Modul | Titik Integrasi | Kontrak Data |
|-------|----------------|--------------|
| **Modul B** (Protocol Gateway) | Autentikasi device via SHA-256 API Key | `device:auth:{hash}` di Redis, TTL 1 jam |
| **Modul B** | Kirim data telemetri via Redis Streams | `{device_id, channel_name, value}` |
| **Modul C** (Dashboard) | Baca tipe widget dari channel_type | `GET /api/v1/devices/{id}/channels` |
| **Modul D** (AI Sandbox) | Baca tier akun untuk throttling | Query ke tabel `accounts.tier` |

---

## ✅ CHECKLIST SEBELUM PRESENTASI

Di VM kamu, pastikan semua ini sudah berjalan:

```bash
# 1. Container PostgreSQL & Redis RUNNING dan HEALTHY
sudo docker compose ps

# 2. bcrypt sudah di-fix (versi 3.2.2)
source .venv/bin/activate
pip show bcrypt | grep Version  # Harus: Version: 3.2.2

# 3. Server web FastAPI sudah berjalan
source .venv/bin/activate
uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload

# 4. Cek koneksi dari browser
# http://10.10.10.2:8000      ← Dashboard
# http://10.10.10.2:8000/docs ← Swagger API

# 5. Seed data sudah ada di database (klik Seed Data Mock di web)
# ATAU jalankan manual:
# sudo docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip
# \dt  ← Harus ada 10 tabel
```

---

## 🔗 REPOSITORY GITHUB

Seluruh kode sudah tersimpan di:
**https://github.com/naufalln85/Telecom-Infra-Project**

Commit terakhir:
- `feat: Initial commit — IoT Platform TIP Modul A Infrastructure`
- `fix: resolve passlib/bcrypt incompatibility and allow external postgresql connections`

---

## 📌 POIN KUNCI YANG HARUS DISAMPAIKAN

> 1. **"Database kami bukan sekadar tempat simpan data"** — ada 9 trigger aktif, 2 VIEW dinamis, 26 index, dan 5 ekstensi produksi yang bekerja otomatis tanpa campur tangan aplikasi.
> 2. **"Keamanan multi-tenant dijamin di level database"** — FK komposit memastikan data Project A tidak bisa bocor ke Project B bahkan jika ada bug di kode backend.
> 3. **"Audit trail riwayat alarm tidak bisa dimanipulasi"** — snapshot JSONB diisi trigger, bukan oleh kode aplikasi yang bisa dimodifikasi.
> 4. **"Anti-spam alert berbasis Redis TTL"** — mencegah notifikasi berulang tanpa perlu polling database.
> 5. **"Siap untuk skala produksi"** — TimescaleDB untuk time-series, pg_stat_statements untuk monitoring query lambat, health checks, persistent volumes.
