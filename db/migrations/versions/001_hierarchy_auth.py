"""Inisialisasi tabel hierarki dan autentikasi dasar.

Revisi ini membuat pondasi schema Modul A:
  - accounts       : Akun pengguna platform (multi-tenant root)
  - projects       : Unit organisasi data, relasi M:N ke accounts
  - project_members: Tabel penghubung M:N accounts <-> projects + role
  - devices        : Perangkat IoT per project
  - data_channels  : Kanal sensor per device

KEPUTUSAN DESAIN UTAMA:
  1. accounts.email unik hanya untuk akun aktif (partial unique index)
     → email bisa didaftarkan ulang setelah akun lama di-soft-delete
  2. project_members sebagai relasi M:N (bukan owner_id kolom di projects)
     → siap untuk penambahan role collaborator tanpa migrasi struktural
  3. devices punya UNIQUE(id, project_id) sebagai composite key
     → dipakai FK komposit di tabel alert_rules untuk enforce tenant boundary
  4. data_channels punya UNIQUE(id, device_id) dan UNIQUE(id, device_id, channel_type)
     → dipakai FK komposit di tabel alert_rules untuk enforce channel ownership

Revision ID: 001
Revises: None (ini adalah migrasi pertama)
Create Date: 2026-07-20
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Metadata Revisi
# ---------------------------------------------------------------------------
revision: str = "001_hierarchy_auth"
down_revision: Union[str, None] = None  # Migrasi pertama, tidak ada parent
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Buat semua tabel hierarki dan autentikasi dasar.

    Urutan pembuatan penting karena foreign key dependencies:
    1. accounts (tidak bergantung ke tabel lain)
    2. projects (tidak bergantung ke tabel lain)
    3. project_members (bergantung ke accounts dan projects)
    4. devices (bergantung ke projects)
    5. data_channels (bergantung ke devices)
    """

    # =========================================================================
    # 1. TABEL: accounts
    # =========================================================================
    # Root dari hierarki multi-tenant. Setiap manusia yang pakai platform ini
    # punya satu baris di sini.
    #
    # Kolom deleted_at: soft-delete pattern.
    # Data akun tidak langsung dihapus permanen — hanya di-tandai.
    # Ini memungkinkan audit trail dan recovery data jika user salah hapus.
    # Penghapusan permanen bisa dijadwalkan via cron job (misal: setelah 30 hari).
    op.create_table(
        "accounts",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column(
            "tier",
            sa.Text(),
            nullable=False,
            server_default="free",
            comment="Tier akun: free | paid. Dibaca Modul D untuk resource limit AI sandbox.",
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
        sa.CheckConstraint("tier IN ('free', 'paid')", name="ck_accounts_tier"),
        sa.PrimaryKeyConstraint("id", name="pk_accounts"),
        comment=(
            "Akun pengguna platform. Multi-tenant: setiap akun bisa punya banyak project. "
            "Email disimpan lowercase dan unik hanya untuk akun aktif."
        ),
    )

    # Partial unique index: email unik hanya di antara akun AKTIF (deleted_at IS NULL)
    # Ini artinya: kalau user hapus akun lama, email yang sama bisa didaftarkan ulang.
    # PostgreSQL mendukung ini natively via WHERE clause di CREATE INDEX.
    op.create_index(
        "uq_accounts_active_email",
        "accounts",
        [sa.text("lower(email)")],  # Case-insensitive: "User@Example.com" == "user@example.com"
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # =========================================================================
    # 2. TABEL: projects
    # =========================================================================
    # Unit organisasi data IoT. Satu project = satu instalasi (misal: "Kebun Pak Ahmad").
    # Device dan alert rule terikat ke project.
    op.create_table(
        "projects",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column(
            "name",
            sa.Text(),
            nullable=False,
            comment="Nama project. Minimal 3 karakter.",
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
        sa.CheckConstraint("char_length(name) >= 3", name="ck_projects_name_length"),
        sa.PrimaryKeyConstraint("id", name="pk_projects"),
        comment="Project IoT. Soft-delete: trigger otomatis menonaktifkan device dan alert rule terkait.",
    )

    # =========================================================================
    # 3. TABEL: project_members
    # =========================================================================
    # Junction table M:N antara accounts dan projects.
    # Setiap baris = "akun X adalah member project Y dengan role Z".
    #
    # MENGAPA RELASI M:N BUKAN KOLOM owner_id DI PROJECTS?
    # Jika kita hanya taruh owner_id di tabel projects:
    #   - Cukup untuk sekarang (1 owner per project)
    #   - Tapi kalau nanti mau tambah collaborator → harus buat tabel baru + migrasi data!
    # Dengan junction table project_members dari awal:
    #   - Mau tambah role collaborator/viewer? Cukup tambah nilai di CHECK constraint role
    #   - Tidak perlu migrasi struktural, tidak ada downtime
    op.create_table(
        "project_members",
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "role",
            sa.Text(),
            nullable=False,
            server_default="owner",
            comment="Role member. Nilai valid: owner, collaborator. Tambah nilai baru = ubah CHECK saja.",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'collaborator')", name="ck_project_members_role"
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_project_members_project_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["accounts.id"],
            name="fk_project_members_account_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("project_id", "account_id", name="pk_project_members"),
        comment="Relasi M:N accounts <-> projects. Mendukung multiple role per akun per project.",
    )

    # Partial unique index: maksimal satu OWNER per project.
    # Tapi bisa banyak collaborator (role != 'owner' tidak dibatasi).
    # Ini enforcement di level database — bukan hanya di aplikasi!
    op.create_index(
        "one_owner_per_project",
        "project_members",
        ["project_id"],
        unique=True,
        postgresql_where=sa.text("role = 'owner'"),
    )

    # =========================================================================
    # 4. TABEL: devices
    # =========================================================================
    # Representasi fisik perangkat IoT yang terdaftar di platform.
    # Setiap device dapat API key untuk autentikasi saat kirim data ke gateway.
    op.create_table(
        "devices",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "name",
            sa.Text(),
            nullable=False,
            comment="Nama device. Minimal 2 karakter.",
        ),
        sa.Column(
            "api_key_hash",
            sa.Text(),
            nullable=False,
            comment=(
                "SHA-256 hash dari API key device. "
                "Plaintext API key TIDAK PERNAH disimpan di DB — hanya ditampilkan sekali saat pembuatan. "
                "SHA-256 cukup aman untuk high-entropy key (32 char random) — tidak perlu bcrypt yang lambat."
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
        sa.CheckConstraint("char_length(name) >= 2", name="ck_devices_name_length"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_devices_project_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_devices"),
        # COMPOSITE UNIQUE (id, project_id):
        # Ini bukan hanya untuk keunikan data — tapi agar bisa dijadikan TARGET FK KOMPOSIT.
        # Tabel alert_rules nanti punya FK komposit ke (devices.id, devices.project_id)
        # untuk memastikan alert rule tidak bisa melintasi batas project (tenant boundary).
        sa.UniqueConstraint("id", "project_id", name="uq_devices_id_project"),
        sa.UniqueConstraint("api_key_hash", name="uq_devices_api_key_hash"),
        comment=(
            "Perangkat IoT. Soft-delete: trigger otomatis menonaktifkan alert rule terkait. "
            "Composite unique (id, project_id) dipakai FK komposit di alert_rules."
        ),
    )

    # Index untuk query "semua device aktif di project X" — query paling sering
    op.create_index(
        "idx_devices_project_active",
        "devices",
        ["project_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    # =========================================================================
    # 5. TABEL: data_channels
    # =========================================================================
    # Kanal data per device. Satu device bisa punya banyak channel (sensor).
    # Contoh: device "Node A" punya channel "temperature", "humidity", "door_state".
    op.create_table(
        "data_channels",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("device_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "name",
            sa.Text(),
            nullable=False,
            comment="Nama channel. Minimal 1 karakter. Unik per device.",
        ),
        sa.Column(
            "channel_type",
            sa.Text(),
            nullable=False,
            server_default="numeric",
            comment=(
                "Tipe data channel. TEXT + CHECK (bukan ENUM) agar penambahan tipe baru "
                "cukup dengan ALTER CONSTRAINT, tidak perlu lock table. "
                "Alert rule threshold HANYA bisa dibuat untuk channel bertipe 'numeric'."
            ),
        ),
        sa.Column(
            "unit",
            sa.Text(),
            nullable=True,
            comment="Satuan pengukuran. Hanya relevan untuk channel_type='numeric'. Contoh: °C, %, m/s.",
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
        sa.CheckConstraint("char_length(name) >= 1", name="ck_data_channels_name_length"),
        sa.CheckConstraint(
            "channel_type IN ('numeric', 'boolean', 'geo', 'image', 'text')",
            name="ck_data_channels_channel_type",
        ),
        sa.ForeignKeyConstraint(
            ["device_id"],
            ["devices.id"],
            name="fk_data_channels_device_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_data_channels"),
        # UNIQUE (device_id, name): nama channel unik per device
        # Boleh ada channel "temperature" di device A dan device B secara bersamaan.
        sa.UniqueConstraint("device_id", "name", name="uq_data_channels_device_name"),
        # COMPOSITE UNIQUE untuk FK komposit di alert_rules:
        # (id, device_id) → dipakai untuk enforce bahwa channel milik device yang sama
        sa.UniqueConstraint("id", "device_id", name="uq_data_channels_id_device"),
        # (id, device_id, channel_type) → dipakai untuk enforce channel_type = 'numeric'
        # di level DB tanpa CHECK yang butuh JOIN ke tabel lain
        sa.UniqueConstraint(
            "id", "device_id", "channel_type", name="uq_data_channels_id_device_type"
        ),
        comment=(
            "Kanal data sensor per device. Modul C menggunakan channel_type dari "
            "GET /devices/{id}/channels untuk menentukan jenis widget di dashboard."
        ),
    )

    # Index standar untuk query "semua channel milik device X"
    op.create_index("idx_data_channels_device_id", "data_channels", ["device_id"])


def downgrade() -> None:
    """
    Rollback: hapus semua tabel migrasi ini dalam urutan terbalik.
    Urutan WAJIB kebalikan dari upgrade() karena foreign key constraints.
    """
    op.drop_index("idx_data_channels_device_id", table_name="data_channels")
    op.drop_table("data_channels")

    op.drop_index("idx_devices_project_active", table_name="devices")
    op.drop_table("devices")

    op.drop_index("one_owner_per_project", table_name="project_members")
    op.drop_table("project_members")

    op.drop_table("projects")

    op.drop_index("uq_accounts_active_email", table_name="accounts")
    op.drop_table("accounts")
