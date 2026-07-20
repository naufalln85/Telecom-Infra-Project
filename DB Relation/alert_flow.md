# 🚨 Diagram Alur Alert Engine & Notification Dispatcher — Modul A

Dokumen ini menjelaskan **secara lengkap dan mudah dipahami** bagaimana sistem Modul A bekerja saat menerima data sensor dari perangkat IoT, mengevaluasi aturan alarm, dan mengirim notifikasi ke Telegram, Email, atau Webhook — semua berdasarkan struktur database di `schema_modul_a.sql`.

---

## 🧠 Konteks Singkat: Siapa yang Mengerjakan Apa?

Sebelum masuk ke diagram, pahami dulu peran komponen-komponen ini:

| Komponen | Peran |
|---|---|
| **Modul B (Protocol Gateway)** | Menerima data dari sensor, lalu mempublikasikannya ke **Redis Streams** |
| **Alert Engine (Modul A)** | Membaca data dari Redis Streams, lalu memeriksa apakah data tersebut memicu aturan alarm |
| **Notification Dispatcher (Modul A)** | Bertanggung jawab mengirim pesan ke Telegram/Email/Webhook |
| **Redis (TTL Cooldown)** | Mencegah alarm yang sama dikirim berulang kali dalam waktu singkat |
| **PostgreSQL (View `active_alert_rules`)** | Satu-satunya sumber aturan alarm yang digunakan Alert Engine, sudah tersaring otomatis |

---

## 📊 Diagram Alur Lengkap (Flowchart)

```mermaid
flowchart TD
    %% ─── Sumber Data ───
    A([📡 Sensor IoT mengirim data]) --> B[Modul B: Protocol Gateway]
    B -->|Normalisasi ke format JSON| RS[(🗄️ Redis Streams\nalert-engine-group)]

    %% ─── Konsumsi Event ───
    RS -->|XREADGROUP| C[Alert Engine membaca pesan:\ndevice_id, channel_name, value]

    %% ─── Cari Aturan di Database ───
    C --> D[Query ke PostgreSQL:\nVIEW active_alert_rules\nWHERE device_id dan channel_name cocok]

    D --> E{Apakah ada aturan\nyang cocok untuk\ndevice dan channel ini?}

    E -->|❌ Tidak Ada| Z[XACK: Tandai pesan selesai\n➜ Selesai]
    E -->|✅ Ada| F{Evaluasi kondisi:\nvalue [operator] threshold_value\nContoh: 38.5 > 35.0?}

    F -->|❌ Tidak Cocok| Z
    F -->|✅ Cocok! Alarm terpicu| G

    %% ─── Cek Cooldown di Redis ───
    G[Cek Cooldown di Redis:\nSET alert:cooldown:rule_id 1 NX EX cooldown_seconds]
    G --> H{Redis mengembalikan apa?}

    H -->|nil: Alarm masih dalam\nmasa jeda cooldown| I[🚫 Abaikan pengiriman\nAnti-spam aktif]
    I --> Z

    H -->|OK: Alarm boleh dikirim| J

    %% ─── Catat History ───
    J[💾 Catat ke tabel alert_history:\nvalue_at_trigger + rule_snapshot otomatis diisi trigger]

    J --> K[Ambil konfigurasi target:\nVIEW active_alert_rule_targets\nHanya target yang belum soft-delete]

    K --> L[🚀 Dispatcher mengirim notifikasi secara paralel]

    subgraph Dispatcher Targets
        L --> T1[📱 Telegram Bot API\nchat_id & bot_token dari config JSONB]
        L --> T2[📧 SMTP Email Client\nalamaat email dari config JSONB]
        L --> T3[🔗 Webhook Eksternal\nPOST + Header X-HMAC-Signature]
    end

    T1 & T2 & T3 --> Z

    %% Styling
    classDef db fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef redis fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef action fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef danger fill:#fce4ec,stroke:#c62828,stroke-width:2px

    class D,J,K db
    class RS,G redis
    class L,T1,T2,T3 action
    class I danger
```

---

## 📝 Penjelasan Langkah Demi Langkah (Bahasa Sederhana)

### ➡️ Langkah 1: Terima Data dari Sensor
- Sensor IoT (misalnya sensor suhu) mengirim pembacaan data ke **Protocol Gateway (Modul B)**.
- Modul B mengubah data mentah dari protokol (HTTP/MQTT/CoAP) ke format JSON bersama dan mempublikasikannya ke **Redis Streams** agar semua consumer bisa membaca secara independen.

---

### ➡️ Langkah 2: Alert Engine Membaca Pesan
- Alert Engine berjalan sebagai **consumer group `alert-engine-group`** di Redis Streams.
- Setiap ada pesan baru yang masuk, Alert Engine membacanya menggunakan perintah `XREADGROUP` dan mendapatkan data seperti:
  ```json
  {
    "device_id": 101,
    "channel_name": "temperature",
    "value": 38.5,
    "timestamp": "2026-07-11T17:00:00Z"
  }
  ```

---

### ➡️ Langkah 3: Cari Aturan Alarm di Database
- Alert Engine melakukan query ke **VIEW `active_alert_rules`** di PostgreSQL.
- Query harus memfilter `device_id` dan nama channel dari event, misalnya:
  ```sql
  SELECT ar.*, dc.name AS channel_name
  FROM active_alert_rules ar
  JOIN data_channels dc ON dc.id = ar.channel_id
  WHERE ar.device_id = $1
    AND dc.name = $2;
  ```
- View ini **sudah otomatis menyaring** aturan yang tidak relevan:
  - ✅ Hanya rule dengan `is_active = true`
  - ✅ Hanya untuk project yang belum soft-delete
  - ✅ Hanya untuk device yang belum soft-delete
  - ✅ Hanya untuk channel bertipe `numeric`

> **💡 Kenapa pakai VIEW?** Agar kode backend tidak perlu menulis query panjang berulang kali. Cukup query satu view dan semua kondisi sudah terjaga.

---

### ➡️ Langkah 4: Evaluasi Kondisi Alarm
- Sistem membandingkan nilai sensor dengan batas alarm menggunakan operator yang sudah dikonfigurasi pengguna.
- **Contoh**: Rule mengatakan `temperature > 35.0`, sensor mengirim `38.5` → `38.5 > 35.0` = **BENAR**, alarm terpicu.
- Operator yang didukung: `>`, `<`, `>=`, `<=`, `==`

---

### ➡️ Langkah 5: Cek Masa Jeda (Cooldown) di Redis
Ini adalah mekanisme **anti-spam notifikasi**. Tanpa ini, jika sensor terus membaca `38.5` setiap detik, sistem akan mengirim ratusan pesan Telegram dalam satu menit!

```
SET alert:cooldown:701 1 NX EX 300
```
- `NX` = "buat kunci ini HANYA JIKA belum ada"
- `EX 300` = "hapus kunci ini otomatis setelah 300 detik (5 menit)"

| Hasil Redis | Artinya | Tindakan |
|---|---|---|
| `OK` | Kunci baru dibuat, alarm belum pernah terpicu dalam 5 menit terakhir | Lanjut kirim notifikasi ✅ |
| `nil` | Kunci sudah ada, alarm sudah terpicu baru-baru ini | Abaikan, jangan kirim ❌ |

---

### ➡️ Langkah 6: Catat ke Riwayat Alarm (`alert_history`)
- Sistem menyimpan catatan bahwa alarm ini terpicu, termasuk:
  - `value_at_trigger`: Nilai sensor saat alarm berbunyi (misal: `38.5`)
  - `rule_snapshot`: Foto kondisi aturan pada saat itu (disimpan sebagai JSON) — **ini diisi otomatis oleh Trigger database** sehingga riwayat tetap ada meskipun aturan alarm-nya nanti dihapus oleh user.

---

### ➡️ Langkah 7: Kirim Notifikasi Paralel
- Dispatcher membaca daftar target dari **VIEW `active_alert_rule_targets`** (view ini otomatis menyembunyikan target yang sudah soft-delete).
- Semua target dikirim secara **bersamaan (paralel)**, bukan satu per satu, agar tidak lambat.
- Setelah hasil pengiriman dicatat secara durabel, worker mengirim **`XACK`** ke Redis Streams sebagai tanda pesan selesai diproses. Jika provider gagal atau timeout, pesan harus masuk mekanisme retry/dead-letter dan belum boleh di-XACK.

---

## 🔄 Hubungan dengan Tabel Database

| Langkah di Atas | Tabel/View yang Digunakan |
|---|---|
| Cari aturan alarm aktif | VIEW `active_alert_rules` |
| Evaluasi kondisi | Data dari tabel `alert_rules` (kolom `operator`, `threshold_value`) |
| Cek cooldown | Redis key sementara (TTL = `cooldown_seconds` dari `alert_rules`) |
| Catat riwayat | Tabel `alert_history` + trigger `populate_alert_history_context()` |
| Ambil target notifikasi | VIEW `active_alert_rule_targets` + tabel `notification_channels` |
