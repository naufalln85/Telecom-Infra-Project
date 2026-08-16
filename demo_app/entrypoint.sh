#!/bin/sh
# Start only after the database is reachable, then apply migrations.  No sample
# accounts, projects, devices, or telemetry are ever inserted here.
set -eu

until python -c "import os, psycopg2; psycopg2.connect(os.environ.get('DATABASE_URL_SYNC', os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')))"; do
  echo "[entrypoint] PostgreSQL belum siap; mencoba lagi dalam 3 detik..."
  sleep 3
done

echo "[entrypoint] Menjalankan migrasi database tanpa data dummy..."
alembic -c /app/alembic.ini upgrade head
echo "[entrypoint] Memulai Yugma IoT API..."
exec uvicorn demo_app.app:app --host 0.0.0.0 --port 8000 --workers 1 --log-level info
