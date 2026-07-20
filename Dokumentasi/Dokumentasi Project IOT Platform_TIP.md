# Dokumentasi Proyek: IoT Platform Multi-Tenant
## Fokus: Modul A — Authentication, Hierarchy, Alert Engine, Notification Dispatcher

> Dokumen ini dibuat sebagai referensi lengkap untuk development di Antigravity. Cakupannya: arsitektur keseluruhan sistem (biar konteks lintas modul jelas), lalu detail penuh untuk Modul A yang jadi tanggung jawab kamu. Skema dan detail Modul B/C/D di dokumen ini hanya level ringkasan (scope, bukan implementasi) karena itu bukan kepemilikanmu — kalau nanti dibutuhkan detail penuhnya, itu perlu didiskusikan/diambil dari mahasiswa yang bersangkutan.

---

## Daftar Isi

1. [Ringkasan Proyek](#1-ringkasan-proyek)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Pembagian Modul](#3-pembagian-modul)
4. [Timeline Proyek](#4-timeline-proyek)
5. [Modul A — Spesifikasi Detail](#5-modul-a--spesifikasi-detail)
6. [Skema Database Modul A](#6-skema-database-modul-a)
7. [Catatan Implementasi Penting](#7-catatan-implementasi-penting)
8. [Titik Koordinasi dengan Modul Lain](#8-titik-koordinasi-dengan-modul-lain)
9. [Ide Pengembangan Jangka Panjang](#9-ide-pengembangan-jangka-panjang-di-luar-scope-8-minggu)
10. [Referensi](#10-referensi)

---

## 1. Ringkasan Proyek

Platform IoT multi-tenant dengan model freemium, dikerjakan oleh 4 mahasiswa (Modul A/B/C/D), mendukung banyak protokol komunikasi device, punya AI model serving dengan sandbox, dashboard realtime, alerting, dan logging performa.

Tujuan platform ini dua lapis:
1. Tugas kelompok mata kuliah (4 modul, dinilai bersama).
2. Infrastruktur riset — data metrics-nya diekspos lewat API export supaya mahasiswa lain bisa pakai buat kebutuhan riset TA mereka sendiri, bukan cuma internal QA.

**Kepemilikan modul:**

| Modul | Owner | Scope |
|---|---|---|
| A | **Kamu** | Auth, hierarki CRUD, alert rule engine, notification dispatcher |
| B | Mahasiswa B | Protocol gateway (HTTP/MQTT/CoAP), normalisasi event, storage worker, metrics logging |
| C | Mahasiswa C | Widget engine dashboard, WebSocket realtime, export log performa |
| D | Mahasiswa D | AI model upload & validasi, inference sandbox, API eksternal AI |

---

## 2. Arsitektur Sistem

### 2.1 Hierarki Data

```
Account (multi-tenant, tenant_id sebagai kolom filter, bukan schema/DB terpisah)
  -> Project (multi per account, lewat relasi M:N via project_members)
    -> Device (multi per project)
      -> Data Channel (multi per device, tipe: numeric/boolean/geo/image/text)
```

### 2.2 Alur Data End-to-End

```
Device --HTTP/MQTT/CoAP--> Protocol Gateway (B)
                                |
                    (normalize ke internal event format)
                                |
                        Redis Streams (event bus, consumer group per modul)
                                |
        -----------------------------------------------------
        |                |                |                 |
  Storage Worker    AI Inference     WebSocket Gateway   Alert Engine
  (B)                Sandbox (D)      (C)                 (A)
  -> TimescaleDB     gVisor/nsjail,   + Redis Pub/Sub     threshold per
  + PostgreSQL        ONNX only,      backplane           data point,
                       zero egress                        cooldown/debounce
        |                |                |                 |
        v                v                v                 v
  Metrics/log      Hasil inferensi   Dashboard client   Telegram / Email /
  per-hop timestamp  ditulis ke DB    realtime           Webhook
```

Empat consumer (Storage Worker, AI Inference, WebSocket Gateway, Alert Engine) membaca event yang sama dari Redis Streams secara independen lewat consumer group masing-masing — tidak saling mengganggu progres baca satu sama lain.

### 2.3 Keputusan Arsitektur Final (Locked — Jangan Diubah Tanpa Diskusi Ulang Tim)

1. **Database**: PostgreSQL untuk metadata, TimescaleDB (extension di atas Postgres yang sama) untuk time-series telemetri. Bukan kombinasi SQL+NoSQL generik.
2. **Event bus internal**: Redis Streams, bukan MQTT broker sebagai backbone. MQTT broker (EMQX/Mosquitto) hanya dipakai di sisi gateway untuk device yang connect via MQTT.
3. **WebSocket fan-out**: wajib pakai Redis Pub/Sub sebagai backplane sejak awal, meski baru 1 instance backend, supaya tidak perlu migrasi ulang saat di-scale.
4. **AI model serving**: hanya ONNX (operator whitelist), dijalankan di sandbox gVisor/nsjail terpisah dari Docker biasa. Resource limit keras: CPU, memori, timeout, zero network egress.
5. **Alerting**: threshold sederhana per data point (bukan kondisi majemuk AND/OR), wajib ada parameter cooldown/debounce.
6. **Performance logging**: timestamp dicatat di setiap hop SISI SERVER SAJA. Platform TIDAK mengklaim mengukur delay device→server yang akurat (butuh device NTP-sync yang di luar kendali platform).
7. **Tenant isolation**: shared schema dengan kolom `tenant_id`/`project_id` sebagai filter, bukan schema-per-tenant atau database-per-tenant.
8. **Container**: Docker untuk servis internal. Sandbox tambahan (gVisor/nsjail) HANYA untuk AI inference karena itu untrusted code execution dari user.

### 2.4 Tech Stack Ringkas

| Layer | Pilihan |
|---|---|
| Metadata DB | PostgreSQL |
| Time-series DB | TimescaleDB (extension Postgres) |
| Event bus | Redis Streams (consumer group per modul) |
| Realtime push | WebSocket + Redis Pub/Sub backplane |
| Protocol gateway | HTTP (REST), MQTT (EMQX/Mosquitto), CoAP (aiocoap/libcoap) |
| AI serving | ONNX Runtime dalam sandbox gVisor/nsjail |
| Container | Docker (servis inti), gVisor/nsjail (AI sandbox saja) |
| Notification | Telegram Bot API, SMTP, webhook generik |

### 2.5 Batasan yang Didokumentasikan (Bukan Bug, Keputusan Desain)

- Delay device→platform TIDAK diukur akurat kecuali device sudah NTP-sync sendiri. Ini tanggung jawab pengguna platform, bukan platform.
- Alerting hanya threshold tunggal per data point, tidak mendukung kondisi majemuk di versi ini.
- DB eksternal (selain Postgres/Timescale bawaan) hanya lewat API endpoint di fase 2, tidak ada di MVP.

---

## 3. Pembagian Modul

**Modul A (kamu)** — Backbone identitas & kontrol: authentication/authorization, CRUD hierarki account/project/device/data channel, alert rule engine (threshold + cooldown), notification dispatcher (Telegram/email/webhook).

**Modul B** — Protocol gateway untuk HTTP/MQTT/CoAP, normalisasi ke satu format event internal, storage worker (tulis ke TimescaleDB), metrics/performance logging per-hop.

**Modul C** — Widget engine dashboard (boolean, gauge, chart, map, image), WebSocket gateway dengan Redis Pub/Sub backplane, endpoint export log performa.

**Modul D** — Model upload & validasi (ONNX + operator whitelist), AI inference sandbox (gVisor/nsjail, orchestrator terpisah dari sandbox process), API eksternal untuk AI server milik pengguna.

---

## 4. Timeline Proyek

Target selesai: **31 Agustus**, tanpa buffer terpisah di akhir. Risiko struktural utama: schema event internal di Minggu 1 adalah *single point of failure* — kalau molor lebih dari 3-4 hari, modul A/C/D yang bergantung padanya ikut tertunda dan kompresi jadwal di minggu-minggu berikutnya tidak punya slack tambahan.

| Minggu | Tanggal | Fokus Modul A | Milestone / Checkpoint Tim |
|---|---|---|---|
| 1 | 6–12 Jul | Skema DB hierarki account/project/device/data channel | **Hard deadline 9 Jul**: schema event internal final & di-commit bareng tim |
| 2 | 13–19 Jul | Setup PostgreSQL, migrasi tabel hierarki + auth dasar | Tiap modul jalan isolated |
| 3 | 20–26 Jul | CRUD hierarki lengkap + sistem API key device | **Checkpoint**: A & B sepakat final format API key |
| 4 | 27 Jul–2 Agu | Alert rule engine dasar (threshold saja, belum cooldown) | Milestone: end-to-end pertama, device dummy → dashboard basic |
| 5 | 3–9 Agu | Cooldown/debounce alert + notification dispatcher (Telegram dulu, email nyusul) | — |
| 6 | 10–16 Agu | Integrasi lintas modul; ikut audit manual sandbox bareng D (dua pasang mata) | **Checkpoint keamanan** |
| 7 | 17–23 Agu | Dokumentasi teknis + bug-fixing sisa | Demo internal 23 Agustus |
| 8 | 24–30 Agu | Feature freeze total mulai 24 Agu, hanya perbaikan dari demo internal | Siapkan demo final |
| — | 31 Agustus | **Demo final / serah terima** | |

---

## 5. Modul A — Spesifikasi Detail

### 5.1 Ruang Lingkup

1. **Authentication & authorization**: registrasi/login akun, API key per account/project untuk device, role dasar (owner project).
2. **Hierarki data (CRUD)**: account → project → device → data channel, dengan `tenant_id`/`project_id` sebagai kolom filter di setiap tabel.
3. **Alert rule engine**: threshold tunggal per data point, dengan parameter cooldown/debounce.
4. **Notification dispatcher**: konsumsi event dari Redis Streams (consumer group terpisah — `alert-engine-group`), evaluasi rule, kirim ke channel yang dikonfigurasi user (Telegram Bot API, email SMTP, webhook generik).

### 5.2 Yang BUKAN Tanggung Jawab Modul A

- Protocol gateway (itu Modul B).
- AI inference sandbox (itu Modul D).
- Rule engine **tidak perlu** mendukung kondisi majemuk (AND/OR antar device) — keputusan tim final, jangan over-engineer.

### 5.3 Deliverable

- Skema database (ERD) untuk hierarki account/project/device/data channel/alert rule.
- Spesifikasi API endpoint (CRUD hierarki, CRUD alert rule, konfigurasi notification channel).
- Diagram alur consumer Redis Streams → evaluasi rule → cooldown check → dispatch notifikasi.
- Dokumen keputusan format API key device (dikoordinasikan dengan Modul B).

---

## 6. Skema Database Modul A

### 6.1 Entity Relationship — Ringkasan

```
accounts ---< project_members >--- projects
                                       |
                                       v
                                    devices
                                       |
                                       v
                                data_channels
                                       |
                                       v
                                 alert_rules >--- alert_rule_targets ---< notification_channels
                                       |                                  (belongs to accounts)
                                       v
                                alert_history
```

### 6.2 DDL Lengkap

```sql
-- ACCOUNTS
CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROJECTS
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- PROJECT_MEMBERS (relasi M:N accounts <-> projects)
CREATE TABLE project_members (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, account_id)
);

-- Maksimal satu owner per project
CREATE UNIQUE INDEX one_owner_per_project
  ON project_members (project_id) WHERE role = 'owner';

-- DEVICES
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- DATA_CHANNELS
CREATE TABLE data_channels (
  id BIGSERIAL PRIMARY KEY,
  device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'numeric'
    CHECK (channel_type IN ('numeric', 'boolean', 'geo', 'image', 'text')),
  unit TEXT, -- nullable, cuma relevan buat channel_type = 'numeric'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, name)
);

-- ALERT_RULES
CREATE TABLE alert_rules (
  id BIGSERIAL PRIMARY KEY,
  channel_id BIGINT NOT NULL REFERENCES data_channels(id) ON DELETE CASCADE,
  device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE, -- denormalisasi, lihat 6.4
  operator TEXT NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '==')),
  threshold_value NUMERIC NOT NULL,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_seconds >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTIFICATION_CHANNELS
CREATE TABLE notification_channels (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('telegram', 'email', 'webhook')),
  config JSONB NOT NULL, -- chat_id / alamat email / URL webhook + secret
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALERT_RULE_TARGETS (relasi M:N alert_rules <-> notification_channels)
CREATE TABLE alert_rule_targets (
  alert_rule_id BIGINT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  notification_channel_id BIGINT NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (alert_rule_id, notification_channel_id)
);

-- ALERT_HISTORY (opsional, sangat disarankan)
CREATE TABLE alert_history (
  id BIGSERIAL PRIMARY KEY,
  alert_rule_id BIGINT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  value_at_trigger NUMERIC NOT NULL
);
```

### 6.3 Penjelasan Cardinality & Relasi

- **`accounts` — `project_members` — `projects`**: relasi **M:N**. Tanpa tabel penghubung, satu project cuma bisa nempel ke satu account lewat FK langsung — cukup untuk "owner" tunggal sekarang, tapi begitu ada kolaborator kedua, strukturnya harus dirombak total. Dengan `project_members`, satu account bisa jadi member banyak project dan sebaliknya, pertumbuhan tinggal nambah baris.
- **`projects` — `devices` — `data_channels`**: rantai **1:N** standar. `ON DELETE CASCADE` di sini keputusan desain yang perlu didokumentasikan: kalau project dihapus, semua device dan channel di bawahnya ikut kehapus otomatis.
- **`data_channels` — `alert_rules`**: **1:N** — satu channel bisa punya lebih dari satu rule.
- **`alert_rules` — `alert_rule_targets` — `notification_channels`**: **M:N**. Satu rule bisa punya banyak target notifikasi, satu target notifikasi bisa dipakai banyak rule.
- **`alert_rules` — `alert_history`**: **1:N**, satu rule bisa trigger berkali-kali sepanjang waktu.

### 6.4 Keputusan Desain Penting & Alasannya

**`channel_type` — TEXT + CHECK, bukan native ENUM Postgres.**
Sengaja dipilih begitu karena kalau nanti mau nambah tipe baru (misal `audio` atau `vector`), cukup `ALTER TABLE ... DROP CONSTRAINT` + `ADD CONSTRAINT`, tidak menyentuh data yang sudah ada. Native `ENUM` lebih strict tapi menambah value baru punya beberapa keterbatasan di Postgres (tidak bisa dipakai di transaksi yang sama saat ditambahkan, tergantung versi).

Dua konsumen kolom ini: endpoint CRUD `alert_rules` harus menolak request kalau `channel_id` yang dipilih punya `channel_type` di luar `numeric`/`boolean` (validasi level aplikasi, butuh JOIN ke `data_channels`, tidak bisa jadi DB constraint langsung). Response API `GET /devices/{id}/channels` harus menyertakan `channel_type` di setiap objek channel, karena itu yang dipakai Modul C untuk memfilter widget mana yang valid dipasang (map widget hanya untuk `geo`, image widget hanya untuk `image`, dst).

**`tier` di `accounts` — flag sederhana, bukan tabel `tiers` terpisah.**
Logic billing belum perlu jalan sekarang (itu fase 2), jadi cukup jadi "penanda" yang bisa dibaca Modul D untuk resource-limit-per-tier di sandbox-nya. Karena Postgres shared satu database untuk semua modul, D tidak perlu memanggil endpoint API — bisa langsung query tabel `accounts` lewat rantai `devices.project_id -> projects -> project_members -> accounts.tier`. Kalau volume inference tinggi dan query per-request mulai berat, D bisa cache hasilnya di Redis dengan TTL pendek — itu keputusan implementasi di sisi D.

**`project_members` — relasi M:N, bukan kolom `owner_account_id` di `projects`.**
Cara paling gampang tapi jebakan: taruh `owner_account_id` langsung sebagai kolom di `projects`. Cukup untuk sekarang, tapi begitu nanti mau nambah kolaborator kedua (role viewer/editor), harus bikin tabel baru dari nol dan migrasi data lama. Dengan `project_members` dari awal, penambahan role baru nanti tinggal ubah `CHECK` constraint dan bikin endpoint invite — tanpa migrasi struktural.

**`alert_rule_targets` sebagai tabel terpisah — alasan normalisasi.**
Kalau `notification_targets` diimplementasi literal sebagai array/JSON di satu kolom `alert_rules`, itu melanggar bentuk normal pertama (1NF) — satu kolom menyimpan banyak nilai, sulit di-query ("cari semua rule yang notif ke channel Telegram X" harus scan semua row), dan tidak bisa menyimpan metadata per notification channel tanpa duplikasi. Makanya dipecah jadi `notification_channels` (daftar tujuan notifikasi, didaftarkan sekali per account) dan `alert_rule_targets` (junction table).

**`device_id` di `alert_rules` — denormalisasi sengaja.**
Secara teori `device_id` bisa didapat lewat JOIN `channel_id -> data_channels -> device_id`, tapi disimpan ulang di sini supaya query "semua alert rule milik device X" tidak perlu JOIN tambahan. Trade-off: ada risiko dua kolom ini tidak konsisten kalau di-insert sembarangan (constraint declaratif biasa tidak bisa mencegah ini karena butuh baca nilai dari tabel lain) — perlu validasi di level aplikasi atau trigger, bukan di skema.

**`one_owner_per_project` — partial unique index.**
Spec menyebut "role dasar (owner project)", tunggal. Tanpa batasan tambahan, struktur M:N `project_members` secara teori bisa punya lebih dari satu baris `role = 'owner'` per project. Partial unique index ini memastikan maksimal satu owner per project, murni sebagai constraint level database.

---

## 7. Catatan Implementasi Penting

### Auth & API Key
- API key device: **jangan simpan plaintext**, simpan hash-nya saja (SHA-256 cukup — API key sudah high-entropy, tidak perlu bcrypt/argon2 yang lambat seperti untuk password).
- Password akun manusia: pakai bcrypt/argon2 (kasus berbeda dari API key, karena password rentan dictionary/brute-force).
- Format API key: pilih antara **static key** (divalidasi lewat cache/endpoint verify — lebih simpel, gampang di-revoke instan, direkomendasikan untuk MVP 8 minggu) vs **token signed HMAC/JWT** (bisa divalidasi B secara lokal tanpa round-trip, tapi revoke instan jadi lebih rumit, butuh expiry pendek + refresh). **Harus disepakati final dengan Modul B di checkpoint Minggu 3.**

### Alert Engine & Cooldown
- Validasi `channel_type` sebelum membuat `alert_rule` — tolak jika bukan `numeric`/`boolean`.
- Pattern cooldown: `SET alert:cooldown:{rule_id} 1 NX EX {cooldown_seconds}`. Kalau `SET` berhasil, lanjut kirim notifikasi; kalau gagal (key masih ada), skip.
- **Penting**: set key cooldown ini **sebelum** dispatch notifikasi, bukan sesudah — supaya kalau proses dispatch crash/retry, redelivery dari Redis Streams tidak mengirim notifikasi dobel.

### Notification Dispatcher
- Consumer Redis Streams sendiri: `alert-engine-group`, terpisah dari consumer group storage worker/AI/websocket.
- Pola idempotent: `XREADGROUP` untuk baca, `XACK` setelah selesai proses, dan saat consumer restart cek `XPENDING` untuk menemukan pesan yang keclaim tapi belum ke-ack sebelum crash.
- Webhook generik: tambahkan HMAC signature di header (secret per config, mirip pola Stripe/GitHub) supaya penerima bisa verifikasi keasliannya, plus retry dengan backoff kalau gagal kirim.
- Telegram: pakai Telegram Bot API `sendMessage`, butuh `chat_id` dari konfigurasi user.

### Authorization & Multi-Tenant Safety
- Authorization check pakai `EXISTS` query ke `project_members`, bukan kolom `owner_account_id` langsung.
- Filter `tenant_id`/`project_id` di **setiap** query itu wajib mutlak — satu query yang lupa filter ini sama dengan kebocoran data antar tenant.
- Opsional (kalau ada waktu lebih): Postgres Row-Level Security (RLS) sebagai lapisan pengaman tambahan di level DB, jadi walau ada query yang lupa filter di kode aplikasi, DB tetap menolak.

---

## 8. Titik Koordinasi dengan Modul Lain

**Dengan Modul B:**
- Format API key device (final di checkpoint Minggu 3).
- Format payload event untuk `channel_type` non-numeric (geo, image) — harus masuk ke diskusi schema event internal yang dikunci bareng tim di Minggu 1, jangan asumsi semua event isinya angka tunggal.

**Dengan Modul C:**
- Endpoint `GET /devices/{id}/channels` kamu harus expose `channel_type` di response, dipakai C untuk filter widget yang valid.
- **Data contract** soal API baca data historis/current dari TimescaleDB: siapa yang membuat endpoint read-nya (dugaan paling masuk akal: C, karena dashboard yang jadi konsumen utama, tapi query-nya tetap menyentuh skema yang dirancang B) — ini belum eksplisit tertulis di spec siapa pun, perlu disepakati eksplisit di awal supaya tidak ada yang mengira "itu sudah otomatis ada".

**Dengan Modul D:**
- Kolom `tier` di `accounts` dibaca D langsung lewat query (via rantai FK) atau di-cache Redis TTL pendek kalau volume tinggi — beri tahu D bahwa tidak perlu endpoint API terpisah untuk ini.
- Hasil inferensi AI dari D, begitu masuk sistem, hanya menjadi satu `data_channel` lagi (`channel_type = 'image'` atau tipe lain) di hierarki yang kamu kelola — alert engine kamu bisa react ke channel ini tanpa perlu "mengerti" AI sama sekali, threshold biasa tetap berlaku.

---

## 9. Ide Pengembangan Jangka Panjang (Di Luar Scope 8 Minggu)

> Bagian ini murni catatan untuk didiskusikan setelah MVP jalan — **jangan** dimasukkan ke sprint 8 minggu sekarang.

**Model AI bawaan tim, via Docker biasa.**
Ini beda dari model upload user (yang wajib tetap lewat sandbox ONNX + gVisor/nsjail milik D, tidak boleh dilonggarkan). Kalau tim mau menyediakan model AI "bawaan platform" (kode sendiri, sudah dipercaya), itu boleh jalan di Docker biasa — bentuknya worker Redis Streams consumer baru (misal consumer group `builtin-ai-group`), pola serupa orchestrator D tapi tanpa lapisan sandbox karena kodenya trusted. **Jangan pernah campur** dua jalur ini di satu tempat yang sama.

**Tracking device di luar jangkauan WiFi (outdoor tracking).**
Butuh hardware tambahan (modul seluler SIM800L/SIM7600 untuk 2G/4G, atau LoRaWAN untuk hemat daya jangkauan jauh) — di luar scope software 8 minggu ini. Untuk demo sekarang, cukup pakai geo channel dengan device dalam jangkauan WiFi, plus query time-range dari TimescaleDB yang sudah ada untuk menampilkan jejak pergerakan (breadcrumb) — itu sudah membuktikan seluruh alur jalan end-to-end.

**Perluasan RBAC (role editor/viewer).**
Struktur `project_members` sudah siap menampung ini — tinggal ubah `CHECK` constraint di kolom `role` supaya menerima value baru, dan buat endpoint invite yang insert baris baru. **Tidak perlu** migrasi struktural. Hindari membangun sistem RBAC generik penuh (tabel `roles` + `permissions` + junction table) — itu over-engineering untuk kebutuhan platform ini; satu kolom `role` bertipe teks dengan constraint terbatas sudah cukup.

**Alerting yang lebih adaptif (anomaly detection).**
Kalau suatu saat alerting mau di-upgrade dari static threshold ke sesuatu yang lebih pintar (deteksi anomali berbasis pola historis, bukan angka tetap) — pendekatan seperti rolling z-score atau decomposition ala Prophet/LightGBM untuk time-series bisa jadi arah yang relevan. Murni ide fase-2, dan harus didiskusikan dengan tim dulu karena mengubah keputusan final "threshold tunggal saja".

**Freemium billing sungguhan & alert rule majemuk (AND/OR).**
Investasi besar, hanya worth dikejar kalau platform ini dilanjutkan lebih jauh dari sekadar tugas kuliah.

---

## 10. Referensi

- **ThingsBoard** — open-source IoT platform dengan problem space yang mirip: multi-tenant, rule engine, protocol gateway, dashboard. Worth dilihat untuk inspirasi struktur rule engine dan tenant model (bukan untuk ditiru mentah-mentah).
- **AWS IoT Core** — punya pola device authentication (request signing) yang relevan untuk diskusi format API key dengan Modul B.

