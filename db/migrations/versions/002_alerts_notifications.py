"""Tambah tabel alert rules, notification channels, targets, dan history.

Revisi ini membangun sistem alerting Modul A di atas hierarki yang sudah ada:
  - alert_rules          : Aturan threshold per data channel
  - notification_channels: Target notifikasi (Telegram/Email/Webhook) per project
  - alert_rule_targets   : Junction table M:N alert_rules <-> notification_channels
  - alert_history        : Audit trail kejadian alarm (immutable, tidak terhapus walau rule dihapus)

KEPUTUSAN DESAIN UTAMA:
  1. alert_rules.project_id + device_id menggunakan FK KOMPOSIT ke devices(id, project_id)
     → Memastikan rule tidak bisa melintasi batas tenant di level DB (bukan hanya aplikasi)
  2. alert_rules.channel_type wajib 'numeric' via CHECK constraint
     → Alert threshold tidak valid untuk tipe boolean/geo/image/text (kurang deterministik)
     → FK komposit ke data_channels(id, device_id, channel_type) yang dijaga oleh composite unique
  3. alert_rules.cooldown_seconds minimal 1 (bukan 0)
     → Redis SET ... EX tidak menerima nilai 0 (akan error), jadi validasi di DB lebih baik
  4. notification_channels.account_id FK ke project_members(project_id, account_id)
     → Hanya member project yang bisa membuat notification channel
     → Mencegah seseorang dari project lain 'menyisipkan' target notifikasi
  5. alert_rule_targets.project_id sebagai FK komposit ke kedua sisi
     → Menjamin rule dan target notifikasi berada di project yang sama
     → Mencegah cross-tenant notification leakage
  6. alert_history.alert_rule_id menggunakan ON DELETE SET NULL
     → History tidak terhapus walau rule dihapus user
     → Kolom rule_snapshot menyimpan 'foto' kondisi rule saat alarm terpicu

Revision ID: 002
Revises: 001_hierarchy_auth
Create Date: 2026-07-20
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Metadata Revisi
# ---------------------------------------------------------------------------
revision: str = "002_alerts_notifications"
down_revision: Union[str, None] = "001_hierarchy_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Buat tabel alerting dan notification.

    Urutan pembuatan (sesuai dependensi FK):
    1. alert_rules (bergantung ke devices dan data_channels)
    2. notification_channels (bergantung ke project_members)
    3. alert_rule_targets (bergantung ke alert_rules dan notification_channels)
    4. alert_history (bergantung ke alert_rules)
    """

    # =========================================================================
    # 1. TABEL: alert_rules
    # =========================================================================
    # Aturan threshold yang menentukan kapan alarm berbunyi.
    # Contoh: "Jika suhu di channel 'temperature' device 'Sensor A' > 35°C,
    #          tunggu 5 menit sebelum kirim notifikasi berikutnya."
    #
    # DENORMALISASI SENGAJA: project_id dan channel_type disimpan redundan.
    # - project_id: untuk query "semua rule di project X" tanpa JOIN tambahan
    # - channel_type: untuk FK komposit yang enforce channel harus 'numeric'
    # Trade-off: ada potensi inkonsistensi jika di-insert sembarangan.
    # Mitigasi: FK komposit di level DB + validasi di level aplikasi.
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("device_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "channel_type",
            sa.Text(),
            nullable=False,
            server_default="numeric",
            comment=(
                "Didenormalisasi dari data_channels. "
                "CHECK constraint memastikan hanya 'numeric' yang valid. "
                "FK komposit ke data_channels(id, device_id, channel_type) "
                "menjamin konsistensi di level DB."
            ),
        ),
        sa.Column(
            "operator",
            sa.Text(),
            nullable=False,
            comment="Operator perbandingan: >, <, >=, <=, ==",
        ),
        sa.Column(
            "threshold_value",
            sa.Numeric(),
            nullable=False,
            comment="Nilai batas yang dibandingkan dengan data sensor.",
        ),
        sa.Column(
            "cooldown_seconds",
            sa.Integer(),
            nullable=False,
            server_default="60",
            comment=(
                "Jeda minimum antar notifikasi untuk rule ini (dalam detik). "
                "Minimal 1 detik karena Redis SET ... EX tidak menerima nilai 0. "
                "Default 60 detik (1 menit) — cukup untuk mencegah spam tanpa terlalu sering miss."
            ),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
            comment=(
                "Status aktif rule. False saat: device/project di-soft-delete (trigger otomatis), "
                "atau user menonaktifkan manual. Rule tidak aktif tidak akan dievaluasi oleh Alert Engine."
            ),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # CHECK: channel_type wajib 'numeric'
        sa.CheckConstraint(
            "channel_type = 'numeric'", name="ck_alert_rules_channel_type_numeric"
        ),
        # CHECK: operator harus salah satu dari 5 nilai valid
        sa.CheckConstraint(
            "operator IN ('>', '<', '>=', '<=', '==')", name="ck_alert_rules_operator"
        ),
        # CHECK: cooldown minimal 1 detik (Redis EX constraint)
        sa.CheckConstraint(
            "cooldown_seconds >= 1", name="ck_alert_rules_cooldown_min"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_alert_rules"),
        # COMPOSITE UNIQUE untuk menjadi target FK komposit dari alert_rule_targets
        sa.UniqueConstraint("id", "project_id", name="uq_alert_rules_id_project"),
        # FK KOMPOSIT #1: (device_id, project_id) → devices(id, project_id)
        # Menjamin: device milik project yang benar. Rule tidak bisa lintas project.
        sa.ForeignKeyConstraint(
            ["device_id", "project_id"],
            ["devices.id", "devices.project_id"],
            name="fk_alert_rules_device_project",
            ondelete="CASCADE",
        ),
        # FK KOMPOSIT #2: (channel_id, device_id, channel_type) → data_channels(id, device_id, channel_type)
        # Menjamin:
        #   a) Channel milik device yang benar (tidak bisa pakai channel dari device lain)
        #   b) channel_type yang diisi di sini SAMA dengan yang di data_channels
        #      → Kombinasi dengan CHECK channel_type='numeric' = DB memastikan channel harus numeric
        sa.ForeignKeyConstraint(
            ["channel_id", "device_id", "channel_type"],
            ["data_channels.id", "data_channels.device_id", "data_channels.channel_type"],
            name="fk_alert_rules_channel_device_type",
            ondelete="CASCADE",
        ),
        comment=(
            "Aturan threshold alert. FK komposit menjamin: "
            "(1) channel milik device yang benar, "
            "(2) device milik project yang benar, "
            "(3) channel_type = numeric secara konsisten di level DB."
        ),
    )

    # Index untuk query Alert Engine: "semua rule aktif untuk device X"
    # Query ini paling sering dipanggil saat event masuk dari Redis Streams
    op.create_index(
        "idx_alert_rules_active_device",
        "alert_rules",
        ["device_id"],
        postgresql_where=sa.text("is_active = true"),
    )

    # =========================================================================
    # 2. TABEL: notification_channels
    # =========================================================================
    # Konfigurasi target notifikasi yang disimpan per project.
    # Satu notification channel bisa dipakai oleh banyak alert rule (M:N via alert_rule_targets).
    #
    # SCOPE: Milik project, bukan milik user individual.
    # Alasannya: Semua member project harus bisa mendapatkan notifikasi dari project tersebut,
    # bukan hanya user yang membuat alertnya.
    #
    # KEAMANAN: Isi config (token Telegram, SMTP password, webhook secret) HARUS dienkripsi
    # oleh backend sebelum disimpan ke kolom config JSONB.
    # Enkripsi: AES-256-GCM dengan key dari environment variable / KMS.
    op.create_table(
        "notification_channels",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            nullable=False,
            comment=(
                "Siapa yang membuat notification channel ini. "
                "FK ke project_members(project_id, account_id) memastikan "
                "hanya member aktif project yang bisa membuat notif channel di project tersebut."
            ),
        ),
        sa.Column(
            "name",
            sa.Text(),
            nullable=False,
            comment="Nama deskriptif. Contoh: 'Telegram Bot Kebun Pak Ahmad'.",
        ),
        sa.Column(
            "type",
            sa.Text(),
            nullable=False,
            comment="Jenis target notifikasi: telegram | email | webhook",
        ),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            comment=(
                "Konfigurasi spesifik per type. WAJIB dienkripsi oleh backend. "
                "Telegram: {ciphertext: '...'} (encrypt chat_id + bot_token). "
                "Email: {ciphertext: '...'} (encrypt smtp config). "
                "Webhook: {ciphertext: '...'} (encrypt url + secret HMAC). "
                "Tidak pernah simpan plaintext token/password/secret di sini!"
            ),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint("char_length(name) >= 2", name="ck_notif_channels_name_length"),
        sa.CheckConstraint(
            "type IN ('telegram', 'email', 'webhook')", name="ck_notif_channels_type"
        ),
        # CHECK: config harus JSON object (bukan array, string, atau null)
        sa.CheckConstraint(
            "jsonb_typeof(config) = 'object'", name="ck_notif_channels_config_object"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_notification_channels"),
        # COMPOSITE UNIQUE untuk menjadi target FK komposit dari alert_rule_targets
        sa.UniqueConstraint("id", "project_id", name="uq_notif_channels_id_project"),
        # FK KOMPOSIT: (project_id, account_id) → project_members(project_id, account_id)
        # Memastikan pembuat notification channel adalah member aktif project tsb.
        # ON DELETE CASCADE: kalau member keluar dari project, notif channel-nya ikut terhapus.
        sa.ForeignKeyConstraint(
            ["project_id", "account_id"],
            ["project_members.project_id", "project_members.account_id"],
            name="fk_notif_channels_project_member",
            ondelete="CASCADE",
        ),
        comment=(
            "Target notifikasi alarm. Milik project, bukan user individual. "
            "FK ke project_members memastikan hanya member project yang bisa membuat notif channel. "
            "config wajib dienkripsi backend sebelum disimpan."
        ),
    )

    # Index untuk query "semua notification channel aktif di project X"
    op.create_index(
        "idx_notif_channels_project_active",
        "notification_channels",
        ["project_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # =========================================================================
    # 3. TABEL: alert_rule_targets
    # =========================================================================
    # Junction table M:N: satu alert rule bisa punya banyak target notifikasi,
    # satu target notifikasi bisa dipakai banyak alert rule.
    #
    # KOLOM project_id di sini adalah kunci desain keamanan multi-tenant:
    # FK komposit ke KEDUA SISI memastikan rule dan target ada di project yang sama.
    # Tanpa ini, seseorang bisa saja "mengirimkan" alert rule dari project A
    # ke notification channel milik project B — kebocoran data antar tenant!
    op.create_table(
        "alert_rule_targets",
        sa.Column("alert_rule_id", sa.BigInteger(), nullable=False),
        sa.Column("notification_channel_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "project_id",
            sa.BigInteger(),
            nullable=False,
            comment=(
                "Kolom kunci keamanan multi-tenant. "
                "FK komposit ke alert_rules(id, project_id) DAN ke notification_channels(id, project_id) "
                "memastikan kedua sisi ada di project yang sama. "
                "Tanpa ini, cross-tenant notification leakage bisa terjadi."
            ),
        ),
        sa.PrimaryKeyConstraint(
            "alert_rule_id", "notification_channel_id", name="pk_alert_rule_targets"
        ),
        # FK KOMPOSIT ke alert_rules — dengan project_id sebagai pengunci
        sa.ForeignKeyConstraint(
            ["alert_rule_id", "project_id"],
            ["alert_rules.id", "alert_rules.project_id"],
            name="fk_art_alert_rule_project",
            ondelete="CASCADE",
        ),
        # FK KOMPOSIT ke notification_channels — dengan project_id yang SAMA sebagai pengunci
        sa.ForeignKeyConstraint(
            ["notification_channel_id", "project_id"],
            ["notification_channels.id", "notification_channels.project_id"],
            name="fk_art_notif_channel_project",
            ondelete="CASCADE",
        ),
        comment=(
            "Junction table M:N alert_rules <-> notification_channels. "
            "project_id sebagai kolom pengunci lintas FK memastikan kedua sisi selalu di project yang sama."
        ),
    )

    # Index untuk query "semua target notifikasi untuk project X"
    op.create_index(
        "idx_alert_rule_targets_project",
        "alert_rule_targets",
        ["project_id"],
    )

    # =========================================================================
    # 4. TABEL: alert_history
    # =========================================================================
    # Audit trail IMMUTABLE dari setiap kejadian alarm.
    #
    # FILOSOFI DESAIN: History tidak boleh hilang walau rule-nya dihapus.
    # Bayangkan ini sebagai "buku catatan kejadian" — sekali ditulis, tidak bisa dihapus.
    # Ini penting untuk: debugging, compliance, analisis pola masalah.
    #
    # rule_snapshot: kolom JSONB yang menyimpan "foto" kondisi alert rule
    # pada saat alarm terpicu — diisi otomatis oleh trigger di migrasi 003.
    # Bahkan kalau rule kemudian diubah atau dihapus, history tetap akurat.
    op.create_table(
        "alert_history",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column(
            "alert_rule_id",
            sa.BigInteger(),
            nullable=True,  # Nullable! Karena ON DELETE SET NULL
            comment=(
                "Referensi ke alert_rules. "
                "SET NULL saat rule dihapus — history tetap ada, rule_id menjadi NULL. "
                "Gunakan rule_snapshot untuk detail historis jika alert_rule_id sudah NULL."
            ),
        ),
        sa.Column(
            "project_id",
            sa.BigInteger(),
            nullable=False,
            comment="Diisi otomatis oleh trigger populate_alert_history_context dari alert_rule_id.",
        ),
        sa.Column(
            "device_id",
            sa.BigInteger(),
            nullable=False,
            comment="Diisi otomatis oleh trigger populate_alert_history_context dari alert_rule_id.",
        ),
        sa.Column(
            "channel_id",
            sa.BigInteger(),
            nullable=False,
            comment="Diisi otomatis oleh trigger populate_alert_history_context dari alert_rule_id.",
        ),
        sa.Column(
            "value_at_trigger",
            sa.Numeric(),
            nullable=False,
            comment="Nilai sensor pada saat alarm terpicu. Ini yang memenuhi kondisi threshold.",
        ),
        sa.Column(
            "rule_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            comment=(
                "'Foto' kondisi alert rule saat alarm terpicu. Diisi otomatis oleh trigger. "
                "Berisi: operator, threshold_value, channel_name, cooldown_seconds. "
                "Tetap akurat meskipun rule kemudian diubah atau dihapus."
            ),
        ),
        sa.Column(
            "triggered_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        # ON DELETE SET NULL: kalau alert_rules dihapus, set kolom ini ke NULL
        # (bukan hapus baris history!)
        sa.ForeignKeyConstraint(
            ["alert_rule_id"],
            ["alert_rules.id"],
            name="fk_alert_history_rule_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_alert_history"),
        comment=(
            "Audit trail immutable kejadian alarm. "
            "Tidak terhapus walau alert_rule dihapus (SET NULL). "
            "rule_snapshot berisi foto kondisi rule saat kejadian."
        ),
    )

    # Index utama untuk query history: "semua alarm di project X, terbaru dulu"
    # Ini query yang paling sering dipanggil dari endpoint GET /projects/{id}/alerts/history
    op.create_index(
        "idx_alert_history_project_triggered",
        "alert_history",
        ["project_id", sa.text("triggered_at DESC")],
    )

    # Index untuk query "semua history dari rule X" — berguna untuk analytics
    op.create_index(
        "idx_alert_history_rule_id",
        "alert_history",
        ["alert_rule_id"],
    )


def downgrade() -> None:
    """
    Rollback: hapus semua tabel migrasi ini dalam urutan terbalik.
    """
    op.drop_index("idx_alert_history_rule_id", table_name="alert_history")
    op.drop_index("idx_alert_history_project_triggered", table_name="alert_history")
    op.drop_table("alert_history")

    op.drop_index("idx_alert_rule_targets_project", table_name="alert_rule_targets")
    op.drop_table("alert_rule_targets")

    op.drop_index("idx_notif_channels_project_active", table_name="notification_channels")
    op.drop_table("notification_channels")

    op.drop_index("idx_alert_rules_active_device", table_name="alert_rules")
    op.drop_table("alert_rules")
