-- =============================================================================
-- INISIALISASI DATABASE — IoT Platform TIP
-- File ini dijalankan SEKALI saat container PostgreSQL pertama kali dibuat
-- (hanya jika volume masih kosong / fresh install)
--
-- URUTAN EKSEKUSI:
-- 1. Docker membuat database dari POSTGRES_DB env var
-- 2. Script ini dijalankan otomatis oleh entrypoint PostgreSQL
-- 3. Setelah ini, Alembic mengurus pembuatan tabel via migrasi
-- =============================================================================

-- Aktifkan ekstensi TimescaleDB
-- "CASCADE" artinya dependensinya juga ikut diaktifkan otomatis
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Aktifkan ekstensi untuk monitoring query performance
-- pg_stat_statements: lacak statistik query (berapa lama, berapa kali dipakai)
-- Sangat berguna untuk debug query lambat di production
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Aktifkan ekstensi untuk generate UUID (dipakai opsional di masa depan)
-- Lebih baik siapkan dari awal daripada harus ALTER nanti
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log bahwa inisialisasi berhasil
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Inisialisasi Database IoT Platform TIP selesai.';
  RAISE NOTICE 'Extensions aktif: timescaledb, pg_stat_statements, pgcrypto';
  RAISE NOTICE 'Lanjutkan dengan: alembic upgrade head';
  RAISE NOTICE '====================================================';
END;
$$;
