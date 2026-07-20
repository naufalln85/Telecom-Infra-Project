-- ====================================================================
-- VERIFIKASI SKEMA MODUL A
-- Jalankan setelah schema_modul_a.sql. Seluruh test gagal dengan RAISE
-- EXCEPTION bila constraint atau trigger tidak bekerja sebagaimana mestinya.
-- ====================================================================

TRUNCATE alert_history, alert_rule_targets, notification_channels, alert_rules,
         data_channels, devices, project_members, projects, accounts
RESTART IDENTITY CASCADE;

-- Data dasar: dua tenant yang berbeda.
INSERT INTO accounts (email, password_hash)
VALUES ('owner-a@example.com', 'hash_a'), ('owner-b@example.com', 'hash_b');

INSERT INTO projects (name) VALUES ('Proyek Tenant A'), ('Proyek Tenant B');

INSERT INTO project_members (project_id, account_id, role)
VALUES (1, 1, 'owner'), (2, 2, 'owner');

-- Hanya boleh satu owner per project.
DO $$
BEGIN
  BEGIN
    INSERT INTO project_members (project_id, account_id, role) VALUES (1, 2, 'owner');
    RAISE EXCEPTION 'owner kedua seharusnya ditolak';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;

INSERT INTO devices (project_id, name, api_key_hash)
VALUES (1, 'Sensor A', 'hash_device_a'), (2, 'Sensor B', 'hash_device_b');

INSERT INTO data_channels (device_id, name, channel_type)
VALUES (1, 'temperature', 'numeric'), (1, 'door_state', 'boolean'),
       (2, 'temperature', 'numeric');

-- Rule valid: channel numeric milik device dan tenant yang sama.
INSERT INTO alert_rules (project_id, device_id, channel_id, operator, threshold_value)
VALUES (1, 1, 1, '>', 35.5);

-- Channel milik device lain wajib ditolak oleh FK komposit.
DO $$
BEGIN
  BEGIN
    INSERT INTO alert_rules (project_id, device_id, channel_id, operator, threshold_value)
    VALUES (1, 1, 3, '>', 35.5);
    RAISE EXCEPTION 'channel lintas device seharusnya ditolak';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

-- Channel boolean wajib ditolak karena rule threshold hanya numeric.
DO $$
BEGIN
  BEGIN
    INSERT INTO alert_rules (project_id, device_id, channel_id, channel_type, operator, threshold_value)
    VALUES (1, 1, 2, 'boolean', '==', 1);
    RAISE EXCEPTION 'channel nonnumeric seharusnya ditolak';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

-- Cooldown 0 akan gagal di Redis EX; schema wajib menolaknya lebih awal.
DO $$
BEGIN
  BEGIN
    INSERT INTO alert_rules (project_id, device_id, channel_id, operator, threshold_value, cooldown_seconds)
    VALUES (1, 1, 1, '>', 35.5, 0);
    RAISE EXCEPTION 'cooldown 0 seharusnya ditolak';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

INSERT INTO notification_channels (project_id, account_id, name, type, config)
VALUES
  (1, 1, 'Telegram Tenant A', 'telegram', '{"ciphertext":"encrypted-a"}'),
  (2, 2, 'Telegram Tenant B', 'telegram', '{"ciphertext":"encrypted-b"}');

-- Target di tenant yang sama valid.
INSERT INTO alert_rule_targets (alert_rule_id, notification_channel_id, project_id)
VALUES (1, 1, 1);

-- Target lintas tenant wajib ditolak.
DO $$
BEGIN
  BEGIN
    INSERT INTO alert_rule_targets (alert_rule_id, notification_channel_id, project_id)
    VALUES (1, 2, 1);
    RAISE EXCEPTION 'target lintas tenant seharusnya ditolak';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

-- Trigger mengisi konteks audit; history tetap ada ketika rule dihapus.
INSERT INTO alert_history (alert_rule_id, project_id, device_id, channel_id, value_at_trigger, rule_snapshot)
VALUES (1, 0, 0, 0, 36.2, '{}'::jsonb);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM alert_history
    WHERE project_id = 1 AND device_id = 1 AND channel_id = 1
      AND rule_snapshot ->> 'channel_name' = 'temperature'
  ) THEN
    RAISE EXCEPTION 'snapshot alert history tidak terisi';
  END IF;
END;
$$;

DELETE FROM alert_rules WHERE id = 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alert_history WHERE id = 1 AND alert_rule_id IS NULL) THEN
    RAISE EXCEPTION 'history audit ikut terhapus atau FK tidak menjadi NULL';
  END IF;
END;
$$;

-- Soft-delete project menonaktifkan device/rule dan menyembunyikan rule dari view.
INSERT INTO alert_rules (project_id, device_id, channel_id, operator, threshold_value)
VALUES (1, 1, 1, '>', 35.5);
UPDATE projects SET deleted_at = now() WHERE id = 1;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM active_alert_rules WHERE project_id = 1) THEN
    RAISE EXCEPTION 'rule project soft-delete masih terlihat oleh Alert Engine';
  END IF;
  IF EXISTS (SELECT 1 FROM devices WHERE id = 1 AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'device project soft-delete belum ikut dinonaktifkan';
  END IF;
END;
$$;

-- Email boleh digunakan kembali setelah akun lama di-soft-delete.
UPDATE accounts SET deleted_at = now() WHERE id = 1;
INSERT INTO accounts (email, password_hash) VALUES ('owner-a@example.com', 'hash_a_baru');

SELECT 'Semua verifikasi skema berhasil.' AS status;
