# ERD Modul A — 100% Mengikuti `schema_modul_a.sql`

Dokumen ini adalah sumber ERD utama. Nama tabel, kolom, PK, FK, kolom nullable,
dan aturan relasi di bawah mengikuti skema SQL yang berlaku.

```mermaid
erDiagram
    ACCOUNTS ||--o{ PROJECT_MEMBERS : "account_id FK"
    PROJECTS ||--o{ PROJECT_MEMBERS : "project_id FK"
    PROJECTS ||--o{ DEVICES : "project_id FK"
    DEVICES ||--o{ DATA_CHANNELS : "device_id FK"
    PROJECTS ||--o{ ALERT_RULES : "FK komposit id project_id"
    DEVICES ||--o{ ALERT_RULES : "FK komposit id project_id"
    DATA_CHANNELS ||--o{ ALERT_RULES : "FK komposit id device_id channel_type"
    PROJECTS ||--o{ NOTIFICATION_CHANNELS : "project_id FK"
    PROJECT_MEMBERS ||--o{ NOTIFICATION_CHANNELS : "FK komposit project_id account_id"
    ALERT_RULES ||--o{ ALERT_RULE_TARGETS : "FK komposit id project_id"
    NOTIFICATION_CHANNELS ||--o{ ALERT_RULE_TARGETS : "FK komposit id project_id"
    ALERT_RULES o|--o{ ALERT_HISTORY : "alert_rule_id, SET NULL saat rule dihapus"

    ACCOUNTS {
      bigserial id PK
      text email "unique aktif, case insensitive"
      text password_hash
      text tier
      timestamptz created_at
      timestamptz updated_at
      timestamptz deleted_at "nullable"
    }
    PROJECTS {
      bigserial id PK
      text name
      timestamptz created_at
      timestamptz updated_at
      timestamptz deleted_at "nullable"
    }
    PROJECT_MEMBERS {
      bigint project_id PK_FK
      bigint account_id PK_FK
      text role
      timestamptz created_at
    }
    DEVICES {
      bigserial id PK
      bigint project_id FK
      text name
      text api_key_hash UK
      timestamptz created_at
      timestamptz updated_at
      timestamptz deleted_at "nullable"
    }
    DATA_CHANNELS {
      bigserial id PK
      bigint device_id FK
      text name
      text channel_type
      text unit "nullable"
      timestamptz created_at
      timestamptz updated_at
    }
    ALERT_RULES {
      bigserial id PK
      bigint project_id FK
      bigint channel_id FK
      bigint device_id FK
      text channel_type
      text operator
      numeric threshold_value
      integer cooldown_seconds
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }
    NOTIFICATION_CHANNELS {
      bigserial id PK
      bigint project_id FK
      bigint account_id FK
      text name
      text type
      jsonb config
      timestamptz created_at
      timestamptz updated_at
      timestamptz deleted_at "nullable"
    }
    ALERT_RULE_TARGETS {
      bigint alert_rule_id PK_FK
      bigint notification_channel_id PK_FK
      bigint project_id FK
    }
    ALERT_HISTORY {
      bigserial id PK
      bigint alert_rule_id FK "nullable"
      bigint project_id
      bigint device_id
      bigint channel_id
      numeric value_at_trigger
      jsonb rule_snapshot
      timestamptz triggered_at
    }
```

## Aturan yang tidak terlihat langsung sebagai garis ERD

- `accounts.email` unik hanya ketika akun aktif: `lower(email)` dan `deleted_at IS NULL`.
- Satu project hanya boleh punya satu `owner` melalui partial unique index pada `project_members`.
- `devices` memiliki `UNIQUE (id, project_id)`; `data_channels` memiliki `UNIQUE (device_id, name)`, `UNIQUE (id, device_id)`, dan `UNIQUE (id, device_id, channel_type)`.
- `alert_rules` hanya menerima `channel_type = 'numeric'`; `operator` hanya `>`, `<`, `>=`, `<=`, atau `==`; `cooldown_seconds` minimal 1 detik.
- `notification_channels.config` harus JSON object. Pembuat channel harus member dari project yang sama.
- `alert_rule_targets.project_id` mengunci rule dan notification channel dalam project yang sama.
- `alert_history` menyimpan snapshot. Jika rule dihapus, `alert_rule_id` menjadi `NULL`, sedangkan history tidak ikut terhapus.

## Otomasi dan view yang terkait dengan ERD

- Trigger mengisi `updated_at` pada tabel yang memiliki kolom tersebut.
- Trigger soft-delete project menonaktifkan device, notification channel, dan alert rule terkait; soft-delete device menonaktifkan alert rule miliknya.
- Trigger history mengisi `project_id`, `device_id`, `channel_id`, dan `rule_snapshot` dari alert rule.
- `active_alert_rules` hanya menampilkan rule aktif pada project/device aktif dan channel numeric.
- `active_alert_rule_targets` hanya menampilkan target notification channel yang belum soft-delete.
