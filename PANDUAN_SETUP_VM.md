# 🚀 Panduan Setup Database & Migrasi (Modul A) di VM
Dokumen ini berisi panduan lengkap langkah demi langkah untuk menjalankan infrastruktur database PostgreSQL + TimescaleDB, Redis, dan menjalankan migrasi skema database Modul A di Virtual Machine (VM) Anda.

---

## 🏗️ 1. Prasyarat Sistem di VM
Sebelum memulai, pastikan VM Anda sudah terinstall komponen-komponen berikut:
1. **Docker & Docker Compose**: Untuk menjalankan PostgreSQL (dengan ekstensi TimescaleDB) dan Redis.
   - Periksa dengan: `docker --version` dan `docker compose version`
2. **Python 3.10+ & pip**: Untuk menjalankan tool migrasi database (Alembic).
   - Periksa dengan: `python3 --version` dan `pip3 --version`
3. **git** (opsional, jika Anda ingin meng-clone repositori langsung di VM).

---

## 📂 2. Struktur Direktori Proyek
Pastikan file-file berikut sudah disalin ke direktori proyek di VM Anda (misal: `/home/user/iot-platform/`):
```
iot-platform/
├── docker-compose.yml              # Konfigurasi container DB & Redis
├── postgres/
│   ├── postgresql.conf             # Tuning database performa tinggi (produksi)
│   └── init.sql                    # Auto-enable extension (TimescaleDB)
├── db/
│   └── migrations/
│       ├── env.py                  # Penghubung Alembic & database URL
│       ├── script.py.mako          # Template file migrasi Python
│       └── versions/               # Folder berisi file migrasi skema
│           ├── 001_hierarchy_auth.py
│           ├── 002_alerts_notifications.py
│           └── 003_triggers_views.py
├── alembic.ini                     # Konfigurasi global Alembic (di root)
├── requirements.txt                # Dependensi Python backend
├── .env.example                    # Template variabel lingkungan
└── .gitignore                      # Proteksi git commit
```

---

## ⚡ 3. Langkah-Langkah Setup & Menjalankan

### Langkah 3.1: Buat dan Konfigurasi File `.env`
Salin template `.env.example` menjadi `.env` di direktori root proyek Anda di VM:
```bash
cp .env.example .env
```
Buka file `.env` menggunakan text editor (seperti `nano` atau `vim`) dan sesuaikan nilai-nilainya:
- Ganti `GANTI_PASSWORD_KUAT_DISINI` dengan password database PostgreSQL yang panjang & aman.
- Ganti `GANTI_REDIS_PASSWORD_DISINI` dengan password Redis yang aman.
- Ganti `GANTI_DENGAN_RANDOM_HEX_64_KARAKTER` dengan random string (bisa digenerate via `openssl rand -hex 32` di terminal VM).

*Catatan: Pastikan `DATABASE_URL` dan `DATABASE_URL_SYNC` menggunakan password yang sudah Anda ganti.*

Jika FastAPI/Alembic dijalankan langsung dari VM/host sementara PostgreSQL dan Redis tetap berjalan di Docker Compose, pakai host `127.0.0.1`:
```env
DATABASE_URL=postgresql+asyncpg://tip_admin:PASSWORD_DB@127.0.0.1:5432/iot_platform_tip
DATABASE_URL_SYNC=postgresql+psycopg2://tip_admin:PASSWORD_DB@127.0.0.1:5432/iot_platform_tip
REDIS_URL=redis://:PASSWORD_REDIS@127.0.0.1:6379/0
SQLALCHEMY_ECHO=false
```

Jika backend FastAPI nanti ikut dimasukkan ke Docker Compose yang sama, baru gunakan host internal service Docker: `db` dan `redis`.

---

### Langkah 3.2: Jalankan Container DB & Redis
Jalankan Docker Compose di latar belakang (background/detached mode):
```bash
docker compose up -d
```
Docker akan men-download image, menginisialisasi database PostgreSQL, mengaktifkan ekstensi TimescaleDB, menerapkan file konfigurasi tuning `postgresql.conf`, dan menyalakan server Redis.

**Verifikasi status container:**
```bash
docker compose ps
```
Pastikan statusnya `Up (healthy)` untuk service `db` dan `redis`. Anda juga bisa memeriksa log database untuk memastikan tidak ada error startup:
```bash
docker compose logs -f db
```

---

### Langkah 3.3: Setup Virtual Environment Python & Install Dependensi
Di terminal VM (di root direktori proyek), buat virtual environment Python untuk mengisolasi library migrasi:
```bash
# Membuat virtual environment bernama '.venv'
python3 -m venv .venv

# Mengaktifkan virtual environment
# Di Linux/macOS:
source .venv/bin/activate
# Di Windows:
# .venv\Scripts\activate

# Install semua dependensi (FastAPI, SQLAlchemy, Alembic, psycopg2, dll.)
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Langkah 3.4: Jalankan Migrasi Database (Alembic)
Dengan virtual environment aktif, jalankan perintah Alembic untuk mengeksekusi migrasi skema database dari versi kosong (`base`) ke versi terbaru (`head`):
```bash
alembic upgrade head
```

Validasi versi migrasi setelah upgrade:
```bash
alembic current
```

Alembic akan otomatis membaca koneksi database dari `.env` dan mengeksekusi tiga file migrasi secara berurutan:
1. `001_hierarchy_auth` (Membuat tabel accounts, projects, members, devices, channels).
2. `002_alerts_notifications` (Membuat tabel rules, notification channels, targets, history).
3. `003_triggers_views` (Membuat trigger updated_at, cascade soft-delete, auto history, dan view active).

Jika berhasil, Anda akan melihat output seperti ini:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transaction capable = True
INFO  [alembic.runtime.migration] Running upgrade  -> 001_hierarchy_auth, Inisialisasi tabel hierarki dan autentikasi dasar.
INFO  [alembic.runtime.migration] Running upgrade 001_hierarchy_auth -> 002_alerts_notifications, Tambah tabel alert rules, notification channels, targets, dan history.
INFO  [alembic.runtime.migration] Running upgrade 002_alerts_notifications -> 003_triggers_views, Tambah trigger otomatis dan view untuk Alert Engine.
```

---

### Langkah 3.5: Verifikasi Skema Database
Untuk memastikan seluruh constraint, index, trigger, dan view berjalan 100% dengan benar di PostgreSQL VM Anda, jalankan skrip verifikasi otomatis `verify_schema.sql` yang ada di folder `DB Relation/verify_schema.sql`.

Anda bisa menjalankannya langsung ke dalam container PostgreSQL menggunakan perintah berikut:
```bash
docker exec -i tip_postgres psql -U tip_admin -d iot_platform_tip < "DB Relation/verify_schema.sql"
```
*(Sesuaikan `-U tip_admin` dan `-d iot_platform_tip` dengan `POSTGRES_USER` dan `POSTGRES_DB` di `.env` Anda jika diganti).*

Jika semua constraint dan trigger bekerja sesuai spesifikasi, output terminal akan diakhiri dengan baris:
```
           status            
-----------------------------
 Semua verifikasi skema berhasil.
(1 row)
```

Jika ada constraint atau trigger yang melanggar spesifikasi (misal: owner ganda diperbolehkan, atau filter tenant bocor), database akan melempar `EXCEPTION` dan menampilkan detail error di terminal Anda.

---

## 🛠️ 4. Detail Arsitektur & Desain Database (Siap untuk Didiskusikan Lintas Modul)

Bagian ini merangkum detail arsitektur database Modul A Anda, yang menjadi bahan diskusi utama dengan anggota tim lainnya (Modul B, C, dan D):

### 1. Pembatasan Batas Tenant (Tenant Boundary Enforcement)
* **Cara Kerja**: Tabel `alert_rules` dan `alert_rule_targets` menggunakan **FK Komposit** (misal: `FOREIGN KEY (device_id, project_id) REFERENCES devices (id, project_id)`).
* **Alasannya (Standard Production)**: Di database relasional, mencegah kebocoran data antar tenant (cross-tenant leakage) sangat penting. FK komposit memaksa database menolak data jika ada upaya mendaftarkan `device_id` milik Proyek A tetapi di-insert di bawah Proyek B.
* **Analoginya**: Seperti memiliki kunci kamar hotel yang hanya cocok dengan pintu kamar di lantai yang sama. Sistem kunci hotel (Postgres) langsung memblokir jika Anda mencoba memakai kartu kamar lantai 1 untuk membuka pintu kamar lantai 2.
* **Contoh Kasus**: User iseng melakukan POST request API untuk membuat Alert Rule dengan payload: `{"project_id": 2, "device_id": 99}`. Jika `device_id 99` sebenarnya adalah milik `project_id 1`, database PostgreSQL akan langsung memblokir transaksi ini (`foreign_key_violation`) sebelum data kotor sempat tersimpan.

### 2. Riwayat Alarm Immutable (`alert_history`)
* **Cara Kerja**: Menggunakan `ON DELETE SET NULL` pada reference `alert_rule_id`, dipadu dengan kolom `rule_snapshot` bertipe `JSONB` yang diisi otomatis saat insert menggunakan trigger PL/pgSQL.
* **Alasannya (Standard Production)**: Di lingkungan produksi, riwayat alarm adalah audit trail penting. Jika pengguna menghapus sebuah rule alarm, kita tidak boleh kehilangan data sejarah kapan alarm itu pernah bunyi di masa lalu. Menyimpan "foto" kondisi rule (threshold, operator, nama channel) saat alarm berbunyi menjamin integritas data masa lalu.
* **Analoginya**: Seperti kotak hitam (black box) pesawat atau kwitansi transaksi. Walaupun toko tempat Anda berbelanja sudah tutup atau produknya sudah tidak dijual, kwitansi cetak di dompet Anda tetap menjadi bukti otentik transaksi masa lalu.
* **Contoh Kasus**: Suhu oven melebihi 100°C pada jam 12:00 siang, alarm berbunyi dan terekam di history. Jam 13:00, user menghapus aturan alarm tersebut. Di database, baris history jam 12:00 tetap ada, kolom `alert_rule_id` menjadi `NULL`, tapi kolom `rule_snapshot` tetap menyimpan data: `{"operator": ">", "threshold_value": 100, "channel_name": "temperature"}`.

### 3. Otomasi Soft-Delete Cascade via Trigger
* **Cara Kerja**: PostgreSQL trigger `trg_projects_soft_delete` memantau kolom `deleted_at` pada proyek. Jika proyek di-soft-delete, database otomatis menyebarkan status soft-delete (`deleted_at = now()`) ke seluruh device, notification channel, dan menonaktifkan alert rules di bawah proyek tersebut.
* **Alasannya (Standard Production)**: Di framework ORM biasa, cascading delete sering dilakukan di level aplikasi dengan menembakkan puluhan query `UPDATE` terpisah. Ini lambat dan rentan gagal di tengah jalan (meninggalkan data yatim/orphan data). Dengan trigger di database, operasi ini berjalan instan dalam satu transaksi atomik.
* **Analoginya**: Seperti saklar utama (master switch) listrik rumah. Saat Anda mematikan saklar utama di meteran depan, seluruh lampu dan elektronik di dalam rumah otomatis mati seketika tanpa Anda harus mendatangi saklar setiap kamar satu per satu.
* **Contoh Kasus**: Ketika user memilih "Hapus Proyek A", aplikasi backend hanya menembakkan 1 query: `UPDATE projects SET deleted_at = now() WHERE id = A`. Detik itu juga, database otomatis men-soft-delete 100 device di bawah proyek tersebut dan menonaktifkan semua rule alarm-nya tanpa overhead query tambahan dari aplikasi backend.

### 4. Database View untuk Performa Alert Engine & Dispatcher
* **Cara Kerja**: Disediakan view `active_alert_rules` dan `active_alert_rule_targets` yang secara otomatis menyarying data proyek aktif, device aktif, dan channel aktif yang belum terhapus.
* **Alasannya (Standard Production)**: Backend Alert Engine (Modul A) dan Storage Worker (Modul B) harus memproses data secepat mungkin tanpa dibebani query JOIN yang kompleks setiap detik. Kode backend hanya perlu melakukan query ke satu View sederhana, menyederhanakan kode dan mengoptimalkan query plan database.
* **Analoginya**: Seperti kaca etalase toko. Pelanggan hanya melihat barang-barang yang ready stock di etalase, tanpa perlu tahu proses inventarisasi gudang belakang yang berantakan.
* **Contoh Kasus**: Backend Alert Engine membaca event sensor masuk, lalu mencocokkannya ke database. Query-nya sangat sederhana: `SELECT * FROM active_alert_rules WHERE device_id = X`. Database secara otomatis menangani filter bahwa proyek device tersebut tidak dalam recycle bin, tanpa perlu backend menulis query JOIN ke 4 tabel berbeda.

---

## 🛠️ 5. Tips Troubleshooting & Monitoring di VM
1. **Periksa Query Lambat (Slow Queries)**:
   Karena kita mengaktifkan ekstensi `pg_stat_statements` di file `postgresql.conf`, Anda bisa melacak query mana yang paling lambat memakan CPU di database dengan menjalankan query ini via `psql`:
   ```sql
   SELECT query, calls, total_exec_time, mean_exec_time 
   FROM pg_stat_statements 
   ORDER BY total_exec_time DESC 
   LIMIT 10;
   ```
2. **Cek Penggunaan Memory Container**:
   Gunakan perintah Docker untuk memantau performa kontainer di VM:
   ```bash
   docker stats tip_postgres tip_redis
   ```
3. **Mengakses PostgreSQL CLI di Container**:
   Jika ingin melakukan query manual:
   ```bash
    docker exec -it tip_postgres psql -U tip_admin -d iot_platform_tip
    ```

---

## 🌐 6. Menjalankan Website Demo (Proof-of-Concept)

Untuk membuktikan secara visual dan interaktif bahwa database PostgreSQL, trigger PL/pgSQL, view active, dan caching/cooldown Redis Modul A berjalan dengan baik, kami telah menyertakan sebuah **Web Dashboard Demo** sederhana berbasis **FastAPI + HTML/JS**.

### Langkah 6.1: Jalankan Server Web Demo di VM
Pastikan virtual environment `.venv` Anda masih aktif, kemudian jalankan server uvicorn:
```bash
uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Langkah 6.2: Tes Auth Register/Login JWT
Endpoint auth sudah memakai bcrypt untuk `password_hash` dan JWT Bearer token untuk sesi login.

```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"password_tes_123","tier":"free"}'

curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"password_tes_123"}'
```

Ambil nilai `access_token`, lalu cek profil:
```bash
curl http://127.0.0.1:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN_DARI_LOGIN"
```

### Langkah 6.2: Akses Dashboard melalui Browser
Buka browser di komputer Anda (luar VM) dan akses IP VM Anda di port 8000:
`http://<IP_VM_ANDA>:8000`

Anda akan melihat dashboard bernuansa gelap (*dark mode*) yang menampilkan status koneksi, tombol kontrol, form simulasi, serta explorer data tabel-tabel database.

---

## 🧪 7. Skenario Pengujian untuk Membuktikan Trigger & Caching

Di website tersebut, Anda dapat membuktikan jalannya fitur database yang telah kita rancang dengan skenario berikut:

### Skenario A: Uji Coba Integrasi Skema & Data Seeding
1. Klik tombol **"Seed Data Mock"** di sisi kiri atas.
2. Konsol log akan menampilkan status sukses, dan tabel-tabel di sisi kanan akan terpopulasi otomatis (klik tombol **Refresh** jika perlu).
3. Anda bisa mengeklik tab-tab explorer di sisi kanan seperti `accounts`, `projects`, `devices`, `data_channels`, `alert_rules`, dan `notification_channels` untuk melihat baris data nyata di database.

### Skenario B: Uji Coba View `active_alert_rules`
1. Buka tab **active_alert_rules (View)** di sisi kanan.
2. Anda akan melihat ada satu aturan aktif: *Suhu Kebun (Device 1) pada channel 'temperature' harus <= 35°C (operator '>' dengan threshold 35.0)*.
3. View ini otomatis memfilter data dari 4 tabel berbeda.

### Skenario C: Uji Coba Alarm Terpicu & Trigger `alert_history`
1. Pada form **Sensor Telemetry Simulator**:
   - Pilih: `Sensor Suhu Kebun (Device 1)`
   - Pilih Kanal: `temperature`
   - Isi Nilai Sensor: `38.5` (ini melanggar batas > 35°C)
2. Klik **Kirim & Evaluasi**.
3. Konsol log akan menampilkan:
   `ALERT BERHASIL TRIGGERED & DISPATCHED! ...`
4. Buka tab **alert_history** di explorer kanan. Anda akan melihat log baru tercatat. Perhatikan kolom **Snapshot (Trigger)**. Kolom ini bertipe JSONB dan berisi data rule pada detik alarm terpicu. Kolom ini terisi secara otomatis berkat trigger database `trg_alert_history_context`.

### Skenario D: Uji Coba Caching Cooldown Redis (Anti-Spam)
1. Segera setelah Skenario C selesai (sebelum 60 detik berlalu), klik kembali tombol **Kirim & Evaluasi** dengan nilai sensor yang sama (`38.5`).
2. Konsol log akan berwarna kuning (Warning) dan menampilkan pesan:
   `Alert terpicu (38.5 > 35.0), tetapi diabaikan karena masih COOLDOWN. Sisa waktu: XX detik.`
3. Ini membuktikan bahwa mekanisme anti-spam notifikasi menggunakan Redis TTL berjalan dengan sempurna, mencegah spam ke device/notifikasi pengguna.

### Skenario E: Uji Coba Soft-Delete Cascading (Trigger Database)
1. Klik tombol **"Soft Delete Proyek 1"** di sisi kiri.
2. Konsol log akan menampilkan status sukses.
3. Klik **Refresh** pada explorer kanan dan cek tab `projects` dan `devices`. Anda akan melihat kolom `deleted_at` terisi dengan timestamp penghapusan. Ini terjadi otomatis berkat trigger database `trg_projects_soft_delete`.
4. Buka tab **active_alert_rules (View)**. Aturan alarm untuk Proyek 1 otomatis hilang dari daftar aktif, sehingga sensor yang mengirim data tidak akan memicu alarm lagi.
5. Klik **"Restore Proyek 1"** untuk mengembalikan status proyek, perangkat, dan aturan alarm menjadi aktif kembali.

### Skenario F: Uji Coba Partial Unique Index pada Email
1. Pada form **Uji Partial Unique Index Email Akun**:
   - Masukkan email: `pak-ahmad@example.com`
   - Klik **Coba Daftar**
2. Konsol log akan merah (Error) dan menampilkan pesan error dari PostgreSQL:
   `Pendaftaran ditolak: Email tersebut sudah terdaftar dan berstatus AKTIF.`
3. Sekarang, klik tombol **"Soft Delete Akun 1 (Ahmad)"**. Akun Ahmad akan ditandai terhapus (`deleted_at` terisi).
4. Coba klik lagi tombol **Coba Daftar** dengan email `pak-ahmad@example.com` yang sama.
5. Pendaftaran berhasil! Ini membuktikan bahwa partial unique index `uq_accounts_active_email` bekerja dengan baik di production: email lama yang sudah dihapus tidak akan menghalangi pendaftaran pengguna baru.
