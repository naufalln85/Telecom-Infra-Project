"""Tambah trigger otomatis dan view untuk Alert Engine.

Revisi ini menambahkan lapisan otomasi database di atas tabel yang sudah ada:

TRIGGER AUTOMATION:
  1. set_updated_at()                  → otomatis update kolom updated_at saat UPDATE
  2. populate_alert_history_context()  → otomatis isi project_id, device_id, channel_id,
                                         dan rule_snapshot dari alert_rule_id saat INSERT alert_history
  3. cascade_project_soft_delete()     → saat project di-soft-delete, otomatis:
                                          a) soft-delete semua device di project ini
                                          b) soft-delete semua notification channel di project ini
                                          c) nonaktifkan semua alert rule di project ini
  4. deactivate_device_rules()         → saat device di-soft-delete, otomatis:
                                          nonaktifkan semua alert rule milik device ini

VIEW (dibaca langsung oleh Alert Engine dan Notification Dispatcher):
  1. active_alert_rules       → rule yang aktif, dari project/device aktif, channel numeric
  2. active_alert_rule_targets → target notifikasi yang belum di-soft-delete

FILOSOFI TRIGGER VS APLIKASI:
  Trigger dipilih untuk operasi yang:
  - HARUS terjadi setiap kali ada perubahan data (bukan hanya dari satu aplikasi)
  - Kalau tidak terjadi = data inconsistent (berbahaya)
  Contoh: kalau set_updated_at hanya di level aplikasi, query direct lewat psql tidak
  akan update timestamp → data jadi tidak bisa dipercaya.

Revision ID: 003
Revises: 002_alerts_notifications
Create Date: 2026-07-20
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Metadata Revisi
# ---------------------------------------------------------------------------
revision: str = "003_triggers_views"
down_revision: Union[str, None] = "002_alerts_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Buat semua fungsi trigger, trigger, dan view.
    op.execute() dipakai untuk DDL yang tidak bisa direpresentasikan
    sebagai operasi Alembic standar (fungsi PL/pgSQL, CREATE VIEW, dll).
    """

    # =========================================================================
    # FUNGSI TRIGGER #1: set_updated_at
    # =========================================================================
    # Trigger fungsi paling sederhana tapi krusial.
    # Memastikan updated_at selalu akurat, bahkan untuk:
    # - Query langsung via psql / pgAdmin / DBeaver (tanpa melalui backend)
    # - Bulk update via script maintenance
    # - Future services yang akses DB langsung
    #
    # Tanpa ini: kolom updated_at hanya diupdate kalau backend yang update
    # → data tidak bisa dipercaya untuk audit trail
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Selalu set updated_at ke waktu sekarang saat ada UPDATE
            -- NEW = baris baru yang akan disimpan
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$;
    """)

    # =========================================================================
    # FUNGSI TRIGGER #2: populate_alert_history_context
    # =========================================================================
    # Trigger ini yang membuat alert_history benar-benar "immutable + accurate":
    # Backend hanya perlu INSERT dengan alert_rule_id dan value_at_trigger.
    # Trigger otomatis mengisi: project_id, device_id, channel_id, rule_snapshot.
    #
    # MENGAPA BUKAN APLIKASI YANG MENGISI?
    # Kalau backend yang mengisi secara manual, ada risiko:
    # - Bug di backend: rule_snapshot tidak konsisten dengan kondisi rule sebenarnya
    # - Race condition: rule berubah antara "baca rule" dan "tulis history"
    # Dengan trigger: pengisian dilakukan dalam transaksi yang sama dengan INSERT,
    # konsistensi dijamin 100%.
    op.execute("""
        CREATE OR REPLACE FUNCTION populate_alert_history_context()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Ambil konteks dari alert_rules + data_channels dalam satu query
            SELECT
                ar.project_id,
                ar.device_id,
                ar.channel_id,
                jsonb_build_object(
                    'operator',         ar.operator,
                    'threshold_value',  ar.threshold_value,
                    'channel_name',     dc.name,
                    'cooldown_seconds', ar.cooldown_seconds
                )
            INTO
                NEW.project_id,
                NEW.device_id,
                NEW.channel_id,
                NEW.rule_snapshot
            FROM alert_rules ar
            JOIN data_channels dc
                ON dc.id = ar.channel_id
                AND dc.device_id = ar.device_id
            WHERE ar.id = NEW.alert_rule_id;

            -- Jika alert_rule_id tidak ditemukan, tolak INSERT
            -- Ini mencegah orphan history yang tidak ada rule-nya
            IF NOT FOUND THEN
                RAISE EXCEPTION
                    'alert_rule_id % tidak ditemukan atau sudah dihapus. '
                    'Tidak bisa membuat alert history tanpa rule yang valid.',
                    NEW.alert_rule_id;
            END IF;

            RETURN NEW;
        END;
        $$;
    """)

    # =========================================================================
    # FUNGSI TRIGGER #3: cascade_project_soft_delete
    # =========================================================================
    # Saat project di-soft-delete (deleted_at di-set dari NULL ke suatu waktu):
    # - Semua device aktif di project ikut di-soft-delete
    # - Semua notification channel aktif di project ikut di-soft-delete
    # - Semua alert rule aktif di project dinonaktifkan (is_active = false)
    #
    # MENGAPA TRIGGER, BUKAN CASCADE ON DELETE BIASA?
    # Soft-delete berbeda dari hard-delete:
    # - Hard-delete: ON DELETE CASCADE di FK sudah cukup
    # - Soft-delete: set kolom deleted_at, bukan hapus baris
    # PostgreSQL tidak punya "ON SOFT-DELETE CASCADE" native — trigger adalah solusinya.
    #
    # MENGAPA AFTER UPDATE, BUKAN BEFORE UPDATE?
    # AFTER: baris project SUDAH tersimpan saat trigger jalan
    # → kita bisa dengan aman query tabel lain dengan data terbaru
    # BEFORE: baris project BELUM tersimpan → OLD dan NEW masih mungkin konflik
    op.execute("""
        CREATE OR REPLACE FUNCTION cascade_project_soft_delete()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Hanya bertindak kalau ini adalah soft-delete baru
            -- (deleted_at berubah dari NULL ke sebuah timestamp)
            -- Bukan update biasa yang tidak mengubah deleted_at
            IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN

                -- Soft-delete semua device aktif di project ini
                -- deleted_at = NEW.deleted_at: waktu soft-delete konsisten (bukan now() lagi)
                UPDATE devices
                SET deleted_at = NEW.deleted_at
                WHERE project_id = NEW.id
                  AND deleted_at IS NULL;

                -- Soft-delete semua notification channel aktif di project ini
                UPDATE notification_channels
                SET deleted_at = NEW.deleted_at
                WHERE project_id = NEW.id
                  AND deleted_at IS NULL;

                -- Nonaktifkan semua alert rule aktif di project ini
                -- (alert_rules tidak punya deleted_at — gunakan is_active = false)
                UPDATE alert_rules
                SET is_active = false
                WHERE project_id = NEW.id
                  AND is_active = true;

            END IF;
            RETURN NEW;
        END;
        $$;
    """)

    # =========================================================================
    # FUNGSI TRIGGER #4: deactivate_device_rules
    # =========================================================================
    # Saat satu device di-soft-delete, nonaktifkan semua alert rule miliknya.
    # Ini mencegah "alarm palsu" dari device yang sudah tidak aktif.
    #
    # Kasus nyata: Sensor suhu rusak dan dicopot → device di-soft-delete →
    # alert rule otomatis nonaktif → tidak ada alarm yang terus bunyi
    # walau tidak ada data yang masuk
    op.execute("""
        CREATE OR REPLACE FUNCTION deactivate_device_rules()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                UPDATE alert_rules
                SET is_active = false
                WHERE device_id = NEW.id
                  AND is_active = true;
            END IF;
            RETURN NEW;
        END;
        $$;
    """)

    # =========================================================================
    # TRIGGER ASSIGNMENTS — Daftarkan fungsi ke tabel yang sesuai
    # =========================================================================

    # updated_at triggers — berlaku untuk setiap UPDATE pada tabel-tabel ini
    op.execute("""
        CREATE TRIGGER trg_accounts_updated_at
            BEFORE UPDATE ON accounts
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    op.execute("""
        CREATE TRIGGER trg_projects_updated_at
            BEFORE UPDATE ON projects
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    op.execute("""
        CREATE TRIGGER trg_devices_updated_at
            BEFORE UPDATE ON devices
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    op.execute("""
        CREATE TRIGGER trg_data_channels_updated_at
            BEFORE UPDATE ON data_channels
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    op.execute("""
        CREATE TRIGGER trg_alert_rules_updated_at
            BEFORE UPDATE ON alert_rules
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    op.execute("""
        CREATE TRIGGER trg_notification_channels_updated_at
            BEFORE UPDATE ON notification_channels
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)

    # Trigger: auto-populate context saat INSERT alert_history
    # BEFORE INSERT agar pengisian data terjadi sebelum baris benar-benar disimpan
    op.execute("""
        CREATE TRIGGER trg_alert_history_context
            BEFORE INSERT ON alert_history
            FOR EACH ROW EXECUTE FUNCTION populate_alert_history_context();
    """)

    # Trigger: cascade soft-delete saat project di-soft-delete
    # AFTER UPDATE OF deleted_at: hanya trigger kalau kolom deleted_at yang berubah
    # (efisiensi: tidak trigger untuk UPDATE kolom lain seperti name)
    op.execute("""
        CREATE TRIGGER trg_projects_soft_delete
            AFTER UPDATE OF deleted_at ON projects
            FOR EACH ROW EXECUTE FUNCTION cascade_project_soft_delete();
    """)

    # Trigger: nonaktifkan alert rules saat device di-soft-delete
    op.execute("""
        CREATE TRIGGER trg_devices_soft_delete
            AFTER UPDATE OF deleted_at ON devices
            FOR EACH ROW EXECUTE FUNCTION deactivate_device_rules();
    """)

    # =========================================================================
    # VIEW #1: active_alert_rules
    # =========================================================================
    # Satu-satunya sumber data yang dipakai Alert Engine untuk mengambil rule.
    # View ini menggabungkan semua filter keaktifan dalam satu tempat:
    # - Rule harus aktif (is_active = true)
    # - Project harus aktif (deleted_at IS NULL)
    # - Device harus aktif (deleted_at IS NULL)
    # - Channel harus numeric (channel_type = 'numeric')
    #
    # MANFAAT: Alert Engine tidak perlu tahu detail filter ini.
    # Cukup query view ini → langsung dapat rule yang valid.
    # Kalau logika filter berubah, cukup update view — bukan kode backend.
    op.execute("""
        CREATE VIEW active_alert_rules AS
        SELECT ar.*
        FROM alert_rules ar
        JOIN projects p
            ON p.id = ar.project_id
            AND p.deleted_at IS NULL       -- Project masih aktif
        JOIN devices d
            ON d.id = ar.device_id
            AND d.deleted_at IS NULL       -- Device masih aktif
        JOIN data_channels dc
            ON dc.id = ar.channel_id
            AND dc.device_id = ar.device_id
        WHERE ar.is_active = true          -- Rule masih aktif
          AND dc.channel_type = 'numeric'; -- Hanya channel numeric
    """)

    # =========================================================================
    # VIEW #2: active_alert_rule_targets
    # =========================================================================
    # Dispatcher membaca view ini untuk mendapatkan daftar target notifikasi
    # yang valid (tidak di-soft-delete) untuk setiap alert rule.
    #
    # Filter: notification_channels.deleted_at IS NULL
    # Artinya: kalau user menghapus notification channel, dispatcher otomatis
    # tidak akan mengirim ke channel tersebut — tanpa perlu ubah kode apapun.
    op.execute("""
        CREATE VIEW active_alert_rule_targets AS
        SELECT
            art.alert_rule_id,
            art.notification_channel_id,
            art.project_id
        FROM alert_rule_targets art
        JOIN notification_channels nc
            ON nc.id = art.notification_channel_id
            AND nc.project_id = art.project_id
            AND nc.deleted_at IS NULL;     -- Target masih aktif (belum soft-delete)
    """)


def downgrade() -> None:
    """
    Rollback: hapus view, trigger, dan fungsi dalam urutan terbalik.
    View dan trigger harus dihapus sebelum fungsi yang mereka pakai.
    """

    # Hapus view dulu
    op.execute("DROP VIEW IF EXISTS active_alert_rule_targets;")
    op.execute("DROP VIEW IF EXISTS active_alert_rules;")

    # Hapus trigger dulu (sebelum fungsinya)
    op.execute("DROP TRIGGER IF EXISTS trg_devices_soft_delete ON devices;")
    op.execute("DROP TRIGGER IF EXISTS trg_projects_soft_delete ON projects;")
    op.execute("DROP TRIGGER IF EXISTS trg_alert_history_context ON alert_history;")
    op.execute("DROP TRIGGER IF EXISTS trg_notification_channels_updated_at ON notification_channels;")
    op.execute("DROP TRIGGER IF EXISTS trg_alert_rules_updated_at ON alert_rules;")
    op.execute("DROP TRIGGER IF EXISTS trg_data_channels_updated_at ON data_channels;")
    op.execute("DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;")
    op.execute("DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;")
    op.execute("DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;")

    # Hapus fungsi trigger
    op.execute("DROP FUNCTION IF EXISTS deactivate_device_rules();")
    op.execute("DROP FUNCTION IF EXISTS cascade_project_soft_delete();")
    op.execute("DROP FUNCTION IF EXISTS populate_alert_history_context();")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at();")
