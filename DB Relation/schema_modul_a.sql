-- ====================================================================
-- SKEMA DATABASE - MODUL A (IoT Platform Multi-Tenant)
-- PostgreSQL
-- Seluruh write yang membuat project + owner wajib dilakukan dalam satu
-- transaksi oleh service API.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ACCOUNTS
-- Email unik hanya untuk akun aktif: akun yang dipurge/soft-delete dapat
-- mendaftar ulang tanpa berbenturan dengan kredensial lama.
-- --------------------------------------------------------------------
CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_accounts_active_email
  ON accounts (lower(email)) WHERE deleted_at IS NULL;

-- --------------------------------------------------------------------
-- 2. PROJECTS dan 3. PROJECT_MEMBERS
-- --------------------------------------------------------------------
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) >= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE project_members (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'collaborator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, account_id)
);

CREATE UNIQUE INDEX one_owner_per_project
  ON project_members (project_id) WHERE role = 'owner';

-- --------------------------------------------------------------------
-- 4. DEVICES
-- (id, project_id) dipakai oleh FK komposit untuk menahan tenant boundary.
-- --------------------------------------------------------------------
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  api_key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (id, project_id)
);

CREATE INDEX idx_devices_project_active
  ON devices (project_id) WHERE deleted_at IS NULL;

-- --------------------------------------------------------------------
-- 5. DATA_CHANNELS
-- Hanya channel numeric yang dapat menjadi sumber alert threshold.
-- --------------------------------------------------------------------
CREATE TABLE data_channels (
  id BIGSERIAL PRIMARY KEY,
  device_id BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1),
  channel_type TEXT NOT NULL DEFAULT 'numeric'
    CHECK (channel_type IN ('numeric', 'boolean', 'geo', 'image', 'text')),
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, name),
  UNIQUE (id, device_id),
  UNIQUE (id, device_id, channel_type)
);

CREATE INDEX idx_data_channels_device_id ON data_channels (device_id);

-- --------------------------------------------------------------------
-- 6. ALERT_RULES
-- project_id dan channel_type sengaja didenormalisasi dan dilindungi FK
-- komposit. Ini membuat rule tidak dapat melintasi project maupun memakai
-- channel nonnumeric.
-- --------------------------------------------------------------------
CREATE TABLE alert_rules (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  channel_id BIGINT NOT NULL,
  device_id BIGINT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'numeric' CHECK (channel_type = 'numeric'),
  operator TEXT NOT NULL CHECK (operator IN ('>', '<', '>=', '<=', '==')),
  threshold_value NUMERIC NOT NULL,
  -- Redis SET ... EX hanya menerima TTL positif; gunakan minimal 1 detik.
  cooldown_seconds INTEGER NOT NULL DEFAULT 60 CHECK (cooldown_seconds >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  FOREIGN KEY (device_id, project_id)
    REFERENCES devices (id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id, device_id, channel_type)
    REFERENCES data_channels (id, device_id, channel_type) ON DELETE CASCADE
);

CREATE INDEX idx_alert_rules_active_device
  ON alert_rules (device_id) WHERE is_active = true;

-- --------------------------------------------------------------------
-- 7. NOTIFICATION_CHANNELS
-- Channel notifikasi adalah resource project. account_id juga harus menjadi
-- anggota project tersebut; akibatnya target tidak dapat lintas tenant.
-- config wajib object dan harus dienkripsi oleh aplikasi/KMS sebelum disimpan.
-- --------------------------------------------------------------------
CREATE TABLE notification_channels (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  account_id BIGINT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 2),
  type TEXT NOT NULL CHECK (type IN ('telegram', 'email', 'webhook')),
  config JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (id, project_id),
  FOREIGN KEY (project_id, account_id)
    REFERENCES project_members (project_id, account_id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_channels_project_active
  ON notification_channels (project_id) WHERE deleted_at IS NULL;

-- --------------------------------------------------------------------
-- 8. ALERT_RULE_TARGETS
-- project_id di junction table mengunci kedua sisi pada project yang sama.
-- --------------------------------------------------------------------
CREATE TABLE alert_rule_targets (
  alert_rule_id BIGINT NOT NULL,
  notification_channel_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  PRIMARY KEY (alert_rule_id, notification_channel_id),
  FOREIGN KEY (alert_rule_id, project_id)
    REFERENCES alert_rules (id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (notification_channel_id, project_id)
    REFERENCES notification_channels (id, project_id) ON DELETE CASCADE
);

CREATE INDEX idx_alert_rule_targets_project ON alert_rule_targets (project_id);

-- --------------------------------------------------------------------
-- 9. ALERT_HISTORY
-- Riwayat bersifat audit record: rule boleh dihapus tanpa menghapus sejarah.
-- Trigger di bawah menyimpan konteks immutable ketika history dibuat.
-- --------------------------------------------------------------------
CREATE TABLE alert_history (
  id BIGSERIAL PRIMARY KEY,
  alert_rule_id BIGINT REFERENCES alert_rules(id) ON DELETE SET NULL,
  project_id BIGINT NOT NULL,
  device_id BIGINT NOT NULL,
  channel_id BIGINT NOT NULL,
  value_at_trigger NUMERIC NOT NULL,
  rule_snapshot JSONB NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_history_project_triggered
  ON alert_history (project_id, triggered_at DESC);
CREATE INDEX idx_alert_history_rule_id ON alert_history (alert_rule_id);

-- --------------------------------------------------------------------
-- AUTOMATION: updated_at, snapshot audit, dan soft-delete propagation.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION populate_alert_history_context()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT ar.project_id,
         ar.device_id,
         ar.channel_id,
         jsonb_build_object(
           'operator', ar.operator,
           'threshold_value', ar.threshold_value,
           'channel_name', dc.name,
           'cooldown_seconds', ar.cooldown_seconds
         )
    INTO NEW.project_id, NEW.device_id, NEW.channel_id, NEW.rule_snapshot
    FROM alert_rules ar
    JOIN data_channels dc ON dc.id = ar.channel_id AND dc.device_id = ar.device_id
   WHERE ar.id = NEW.alert_rule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'alert_rule_id % tidak ditemukan', NEW.alert_rule_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION cascade_project_soft_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE devices SET deleted_at = NEW.deleted_at
      WHERE project_id = NEW.id AND deleted_at IS NULL;
    UPDATE notification_channels SET deleted_at = NEW.deleted_at
      WHERE project_id = NEW.id AND deleted_at IS NULL;
    UPDATE alert_rules SET is_active = false
      WHERE project_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION deactivate_device_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE alert_rules SET is_active = false
      WHERE device_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_data_channels_updated_at BEFORE UPDATE ON data_channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_alert_rules_updated_at BEFORE UPDATE ON alert_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notification_channels_updated_at BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_alert_history_context BEFORE INSERT ON alert_history
  FOR EACH ROW EXECUTE FUNCTION populate_alert_history_context();
CREATE TRIGGER trg_projects_soft_delete AFTER UPDATE OF deleted_at ON projects
  FOR EACH ROW EXECUTE FUNCTION cascade_project_soft_delete();
CREATE TRIGGER trg_devices_soft_delete AFTER UPDATE OF deleted_at ON devices
  FOR EACH ROW EXECUTE FUNCTION deactivate_device_rules();

-- Satu-satunya view yang dipakai Alert Engine untuk mengambil rule.
CREATE VIEW active_alert_rules AS
SELECT ar.*
FROM alert_rules ar
JOIN projects p ON p.id = ar.project_id AND p.deleted_at IS NULL
JOIN devices d ON d.id = ar.device_id AND d.deleted_at IS NULL
JOIN data_channels dc ON dc.id = ar.channel_id AND dc.device_id = ar.device_id
WHERE ar.is_active = true AND dc.channel_type = 'numeric';

-- Dispatcher memakai view ini agar target yang sudah soft-delete tidak terkirim.
CREATE VIEW active_alert_rule_targets AS
SELECT art.alert_rule_id, art.notification_channel_id, art.project_id
FROM alert_rule_targets art
JOIN notification_channels nc
  ON nc.id = art.notification_channel_id
 AND nc.project_id = art.project_id
 AND nc.deleted_at IS NULL;
