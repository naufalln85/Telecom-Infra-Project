# 📑 Spesifikasi API Endpoint — Modul A (IoT Platform)

Dokumen ini berisi spesifikasi lengkap REST API untuk **Modul A**. Semua endpoint mencerminkan secara tepat struktur database di `schema_modul_a.sql`.

**Konvensi umum:**
- Prefix: `/api/v1`
- Format: JSON untuk semua request dan response
- Autentikasi: JWT token di header `Authorization: Bearer <token>`
- Semua endpoint yang dipanggil manusia wajib memverifikasi keanggotaan aktif user di project melalui tabel `project_members`. Endpoint ingest perangkat memakai API key dan validasi perangkat/project aktif, bukan `project_members`.

---

## 🔑 1. Autentikasi (Authentication)

### 1.1 Registrasi Akun
`POST /api/v1/auth/register`

Membuat akun baru. Email hanya harus unik di antara akun yang **aktif** (berkat partial unique index `uq_accounts_active_email WHERE deleted_at IS NULL`). Artinya, jika email lama sudah di-soft-delete, email yang sama bisa didaftarkan ulang.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password_rahasia_123"
}
```

**Response 201 Created:**
```json
{
  "message": "Akun berhasil dibuat",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "tier": "free",
    "created_at": "2026-07-11T17:00:00Z"
  }
}
```

> **Catatan implementasi**: Password di-hash dengan **bcrypt/Argon2** sebelum disimpan ke kolom `password_hash`. Tier default adalah `free`.

---

### 1.2 Login
`POST /api/v1/auth/login`

Mengautentikasi user dan mengembalikan JWT token untuk digunakan di endpoint-endpoint selanjutnya.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password_rahasia_123"
}
```

**Response 200 OK:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "tier": "free"
  }
}
```

> **Keamanan**: Backend harus memastikan akun yang login berstatus aktif (`deleted_at IS NULL`).

---

## 🏢 2. Proyek (Projects)

### 2.1 Buat Proyek Baru
`POST /api/v1/projects`

Membuat proyek baru. **Penting**: Pembuatan proyek dan pendaftaran user sebagai owner harus dilakukan dalam **satu transaksi database** (INSERT ke `projects` + INSERT ke `project_members` secara atomik).

**Request Body:**
```json
{
  "name": "Monitoring Kebun Cerdas"
}
```

**Response 201 Created:**
```json
{
  "message": "Proyek berhasil dibuat",
  "data": {
    "id": 1,
    "name": "Monitoring Kebun Cerdas",
    "role_saya": "owner",
    "created_at": "2026-07-11T17:00:00Z"
  }
}
```

> **Catatan DB**: Nama proyek minimal 3 karakter (constraint `CHECK (char_length(name) >= 3)`).

---

### 2.2 Daftar Proyek Saya
`GET /api/v1/projects`

Menampilkan semua proyek aktif di mana user terdaftar sebagai owner atau collaborator. Query melalui tabel `project_members`.

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Monitoring Kebun Cerdas",
      "role": "owner",
      "created_at": "2026-07-11T17:00:00Z"
    }
  ]
}
```

---

### 2.3 Ubah Nama Proyek
`PUT /api/v1/projects/{projectId}`

Hanya owner yang boleh mengubah nama proyek.

**Request Body:**
```json
{
  "name": "Monitoring Kebun Cerdas V2"
}
```

**Response 200 OK:**
```json
{
  "message": "Proyek berhasil diperbarui"
}
```

---

### 2.4 Hapus Proyek (Soft Delete)
`DELETE /api/v1/projects/{projectId}`

Menandai proyek sebagai terhapus (`deleted_at = now()`). **Trigger database `trg_projects_soft_delete` akan otomatis:**
1. Soft-delete semua `devices` milik proyek ini
2. Soft-delete semua `notification_channels` milik proyek ini
3. Menonaktifkan semua `alert_rules` (`is_active = false`) milik proyek ini

Data akan dihapus permanen oleh cron job setelah 15 hari.

**Response 200 OK:**
```json
{
  "message": "Proyek dipindahkan ke recycle bin. Data akan dihapus permanen dalam 15 hari."
}
```

---

## 🔌 3. Perangkat & Kanal Sensor (Devices & Channels)

### 3.1 Daftarkan Perangkat Baru
`POST /api/v1/projects/{projectId}/devices`

Membuat perangkat baru di dalam proyek. **API Key plain-text hanya ditampilkan sekali di response ini.** Setelah ini, database hanya menyimpan hash SHA-256-nya di kolom `api_key_hash`.

**Request Body:**
```json
{
  "name": "Sensor Suhu Greenhouse"
}
```

**Response 201 Created:**
```json
{
  "message": "Perangkat berhasil didaftarkan. Simpan API Key berikut karena tidak akan ditampilkan lagi!",
  "data": {
    "id": 101,
    "name": "Sensor Suhu Greenhouse",
    "api_key": "tip_live_aB7d9K3mFp2qRt5yWx8zN4vJ1sL6pQ9e"
  }
}
```

---

### 3.2 Daftar Perangkat di Proyek
`GET /api/v1/projects/{projectId}/devices`

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": 101,
      "name": "Sensor Suhu Greenhouse",
      "created_at": "2026-07-11T17:10:00Z"
    }
  ]
}
```

---

### 3.3 Hapus Perangkat (Soft Delete)
`DELETE /api/v1/projects/{projectId}/devices/{deviceId}`

Soft-delete perangkat. **Trigger `trg_devices_soft_delete` otomatis menonaktifkan semua alert rule** (`is_active = false`) yang terhubung ke perangkat ini agar tidak ada alarm palsu.

**Response 200 OK:**
```json
{
  "message": "Perangkat dihapus. Alert rule terkait otomatis dinonaktifkan."
}
```

---

### 3.4 Tambah Kanal Sensor
`POST /api/v1/devices/{deviceId}/channels`

Menambahkan kanal data baru ke perangkat.

**Request Body:**
```json
{
  "name": "temperature",
  "channel_type": "numeric",
  "unit": "°C"
}
```

**Response 201 Created:**
```json
{
  "message": "Kanal sensor berhasil ditambahkan",
  "data": {
    "id": 501,
    "device_id": 101,
    "name": "temperature",
    "channel_type": "numeric",
    "unit": "°C"
  }
}
```

> **Tipe channel yang tersedia**: `numeric`, `boolean`, `geo`, `image`, `text`  
> **Tipe yang bisa dibuatkan Alert Rule**: hanya `numeric` (dijamin oleh Composite FK di database)

---

### 3.5 Daftar Kanal Sensor Perangkat
`GET /api/v1/devices/{deviceId}/channels`

Endpoint ini dikonsumsi oleh **Modul C (Dashboard)** untuk menentukan jenis widget yang tepat berdasarkan `channel_type`.

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": 501,
      "name": "temperature",
      "channel_type": "numeric",
      "unit": "°C"
    },
    {
      "id": 502,
      "name": "lokasi_gps",
      "channel_type": "geo",
      "unit": null
    }
  ]
}
```

---

## 🔔 4. Saluran Notifikasi (Notification Channels)

> **Penting**: Saluran notifikasi milik **project**, bukan milik user secara individual. User yang membuat saluran notifikasi **wajib menjadi anggota project tersebut** — ini dijamin oleh Foreign Key ke tabel `project_members` di database.

### 4.1 Tambah Saluran Notifikasi
`POST /api/v1/projects/{projectId}/notifications/channels`

**Request Body (Contoh Telegram):**
```json
{
  "name": "Telegram Bot Kebun",
  "type": "telegram",
  "config": {
    "chat_id": "-1001234567890",
    "bot_token": "123456:ABCdef..."
  }
}
```

**Request Body (Contoh Email):**
```json
{
  "name": "Email Laporan Harian",
  "type": "email",
  "config": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "from_email": "notif@example.com",
    "to_email": "admin@example.com"
  }
}
```

**Request Body (Contoh Webhook):**
```json
{
  "name": "Webhook ke Sistem Saya",
  "type": "webhook",
  "config": {
    "url": "https://my-system.com/alert-hook",
    "secret": "kunci_rahasia_hmac_saya"
  }
}
```

**Response 201 Created:**
```json
{
  "message": "Saluran notifikasi berhasil ditambahkan",
  "data": {
    "id": 301,
    "project_id": 1,
    "name": "Telegram Bot Kebun",
    "type": "telegram"
  }
}
```

> **Keamanan**: Isi `config` (token, secret) harus **dienkripsi oleh backend/KMS** sebelum disimpan ke kolom `config JSONB` di database. Jangan simpan plain-text kredensial langsung!

---

### 4.2 Hapus Saluran Notifikasi (Soft Delete)
`DELETE /api/v1/projects/{projectId}/notifications/channels/{channelId}`

**Response 200 OK:**
```json
{
  "message": "Saluran notifikasi dihapus. Target yang terhubung otomatis tersembunyi dari dispatcher."
}
```

> Setelah soft-delete, VIEW `active_alert_rule_targets` otomatis menyembunyikan target ini sehingga dispatcher tidak akan mengirim ke saluran ini.

---

## 🚨 5. Aturan Alarm (Alert Rules)

### 5.1 Buat Aturan Alarm Baru
`POST /api/v1/projects/{projectId}/rules`

**Request Body:**
```json
{
  "device_id": 101,
  "channel_id": 501,
  "operator": ">",
  "threshold_value": 35.5,
  "cooldown_seconds": 300,
  "notification_channel_ids": [301]
}
```

**Response 201 Created:**
```json
{
  "message": "Aturan alarm berhasil dibuat",
  "data": {
    "id": 701,
    "project_id": 1,
    "device_id": 101,
    "channel_id": 501,
    "operator": ">",
    "threshold_value": 35.5,
    "cooldown_seconds": 300,
    "is_active": true
  }
}
```

> **Validasi otomatis database**:
> - `channel_id` harus milik `device_id` yang disebutkan → dijamin oleh Composite FK `(channel_id, device_id, channel_type)`.
> - `device_id` dan `project_id` harus konsisten → dijamin oleh Composite FK `(device_id, project_id)`.
> - `channel_type` **wajib `numeric`** → dijamin oleh `CHECK (channel_type = 'numeric')` di `alert_rules`.
> - `notification_channel_id` harus berada di project yang sama → dijamin oleh Composite FK di `alert_rule_targets`.

> `cooldown_seconds` minimal `1` detik karena Redis TTL `EX` tidak menerima nilai `0`.

---

### 5.2 Daftar Aturan Alarm di Proyek
`GET /api/v1/projects/{projectId}/rules`

**Response 200 OK:**
```json
{
  "data": [
    {
      "id": 701,
      "device_name": "Sensor Suhu Greenhouse",
      "channel_name": "temperature",
      "operator": ">",
      "threshold_value": 35.5,
      "cooldown_seconds": 300,
      "is_active": true
    }
  ]
}
```

---

### 5.3 Aktifkan / Nonaktifkan Aturan Alarm
`PATCH /api/v1/projects/{projectId}/rules/{ruleId}`

**Request Body:**
```json
{
  "is_active": false
}
```

**Response 200 OK:**
```json
{
  "message": "Aturan alarm berhasil diperbarui"
}
```

---

## 📜 6. Riwayat Alarm (Alert History)

### 6.1 Riwayat Alarm di Proyek
`GET /api/v1/projects/{projectId}/alerts/history`

**Query Parameters**: `?limit=20&page=1&from=2026-07-01&to=2026-07-11`

**Response 200 OK:**
```json
{
  "data": [
    {
      "history_id": 9001,
      "rule_id": 701,
      "device_id": 101,
      "channel_id": 501,
      "triggered_value": 38.2,
      "rule_snapshot": {
        "operator": ">",
        "threshold_value": 35.5,
        "channel_name": "temperature",
        "cooldown_seconds": 300
      },
      "triggered_at": "2026-07-11T17:20:00Z"
    }
  ]
}
```

> **Catatan penting**: Kolom `rule_snapshot` berisi **foto aturan alarm pada saat kejadian terjadi**. Bahkan jika rule sudah dihapus user setelah kejadian, riwayat alarm tetap ada karena `alert_rule_id` akan menjadi `NULL` (berkat `ON DELETE SET NULL`) tapi `rule_snapshot` masih berisi informasi lengkap dari aturan tersebut.
