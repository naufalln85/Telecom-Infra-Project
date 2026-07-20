"""
=============================================================================
ALEMBIC ENVIRONMENT — IoT Platform TIP (Modul A)

File ini adalah "jembatan" antara Alembic CLI dan kode Python project kita.
Dijalankan setiap kali kamu menjalankan perintah alembic (upgrade, downgrade, dll).

CARA KERJA:
1. Alembic baca alembic.ini untuk mendapatkan konfigurasi dasar
2. Alembic jalankan env.py ini untuk mendapatkan koneksi DB dan metadata SQLAlchemy
3. Alembic baca file di folder versions/ untuk tahu migrasi apa yang perlu dijalankan
4. Alembic eksekusi fungsi upgrade() atau downgrade() sesuai perintah
=============================================================================
"""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Baca konfigurasi logging dari alembic.ini
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =============================================================================
# BACA DATABASE URL DARI ENVIRONMENT VARIABLE
# =============================================================================
# Alembic butuh koneksi SYNC (tidak bisa pakai asyncpg langsung).
# Kita pakai psycopg2 untuk Alembic, asyncpg untuk aplikasi FastAPI runtime.
#
# Di production: DATABASE_URL_SYNC di-set via environment variable server/CI-CD
# Di development: dibaca dari file .env
def get_database_url() -> str:
    """
    Ambil DATABASE_URL_SYNC dari environment.
    Mendukung .env file untuk development lokal.
    Otomatis mengganti host 'db' ke 'localhost' jika dijalankan di luar Docker.
    """
    # Coba baca dari environment langsung (production/CI-CD)
    db_url = os.environ.get("DATABASE_URL_SYNC")
    
    if not db_url:
        # Fallback: coba baca dari .env file (development lokal)
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        if os.path.exists(env_file):
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL_SYNC=") and not line.startswith("#"):
                        db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break

    if not db_url:
        raise RuntimeError(
            "DATABASE_URL_SYNC tidak ditemukan!\n"
            "Pastikan sudah:\n"
            "  1. cp .env.example .env\n"
            "  2. Isi DATABASE_URL_SYNC di .env\n"
            "  Atau set environment variable DATABASE_URL_SYNC secara langsung."
        )

    # DETEKSI LINGKUNGAN: Jika berjalan di luar Docker container, ganti host 'db' menjadi 'localhost'
    # agar developer bisa menjalankan migrasi langsung dari host machine / VM.
    if not os.path.exists("/.dockerenv") and "@db:" in db_url:
        db_url = db_url.replace("@db:", "@localhost:")

    return db_url


# Override sqlalchemy.url dari alembic.ini dengan nilai dari environment
config.set_main_option("sqlalchemy.url", get_database_url())

# =============================================================================
# TARGET METADATA SQLALCHEMY
# =============================================================================
# Ini dipakai untuk fitur --autogenerate: Alembic bisa detect perubahan model
# otomatis dan buat file migrasi draft.
#
# Import Base dari models SQLAlchemy kita.
# Pada fase Tugas 2 ini, kita belum punya models/ folder (itu Tugas 3+),
# sehingga target_metadata = None dan semua DDL ditulis manual di setiap
# file migrasi menggunakan op.create_table(), op.execute(), dll.
#
# Catatan: Ketika models SQLAlchemy sudah dibuat di Tugas 3, ubah ini ke:
#   from app.db.base import Base
#   target_metadata = Base.metadata
target_metadata = None


# =============================================================================
# MIGRASI OFFLINE (tanpa koneksi DB aktif)
# =============================================================================
def run_migrations_offline() -> None:
    """
    Jalankan migrasi dalam mode 'offline' — generate SQL script saja,
    tidak benar-benar terhubung ke database.

    Berguna untuk: preview SQL yang akan dieksekusi, atau jalankan di
    environment yang tidak punya koneksi DB langsung (misal CI pipeline).

    Cara pakai: alembic upgrade head --sql > migration.sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Pastikan transaksi per migrasi (atomik)
        transaction_per_migration=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# =============================================================================
# MIGRASI ONLINE (koneksi DB aktif — mode normal)
# =============================================================================
def run_migrations_online() -> None:
    """
    Jalankan migrasi dalam mode 'online' — konek ke DB dan eksekusi langsung.
    Ini mode yang dipakai saat: alembic upgrade head

    Konfigurasi pool:
    - NullPool: Alembic tidak butuh connection pool (hanya satu koneksi,
      satu kali, lalu selesai). NullPool lebih efisien untuk ini.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Bandingkan tipe kolom saat --autogenerate
            compare_type=True,
            # Bandingkan server default saat --autogenerate
            compare_server_default=True,
            # Transaksi per migrasi: kalau satu migrasi gagal,
            # hanya migrasi itu yang di-rollback, bukan semuanya.
            transaction_per_migration=True,
            # Render AS NULL untuk kolom nullable (konsisten dengan psycopg2)
            render_as_batch=False,
        )

        with context.begin_transaction():
            context.run_migrations()


# =============================================================================
# ENTRY POINT: Alembic panggil salah satu fungsi di atas
# =============================================================================
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
