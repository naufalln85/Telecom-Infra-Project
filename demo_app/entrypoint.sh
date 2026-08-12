#!/bin/bash
# =============================================================================
# IoT Platform TIP — Backend Entrypoint
# Urutan: Wait DB → Alembic migrate → Seed (opsional) → Start FastAPI
# =============================================================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       🚀 IoT Platform TIP — Backend Startup                ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  1. Menunggu PostgreSQL siap...                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Tunggu PostgreSQL tersedia ────────────────────────────────────────────
until python -c "
import psycopg2, os, sys
url = os.environ.get('DATABASE_URL_SYNC', '')
if not url:
    # Derive from asyncpg URL
    url = os.environ.get('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
try:
    psycopg2.connect(url)
    sys.exit(0)
except Exception as e:
    sys.exit(1)
"; do
    echo "[entrypoint] ⏳ PostgreSQL belum siap, coba lagi dalam 3 detik..."
    sleep 3
done

echo "[entrypoint] ✅ PostgreSQL siap!"
echo ""

# ── 2. Jalankan Alembic Migrations ─────────────────────────────────────────
echo "[entrypoint] 🔄 Menjalankan Alembic migrations..."
cd /app
alembic -c /app/alembic.ini upgrade head
echo "[entrypoint] ✅ Migrations selesai!"
echo ""

# ── 3. Seed Data Awal (hanya jika tabel masih kosong) ──────────────────────
echo "[entrypoint] 🌱 Mengecek apakah perlu seed data..."
python -c "
import os, asyncio
import psycopg2

url = os.environ.get('DATABASE_URL_SYNC', '')
if not url:
    url = os.environ.get('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')

conn = psycopg2.connect(url)
cur = conn.cursor()

# Cek apakah tabel accounts sudah ada data
cur.execute('SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL')
count = cur.fetchone()[0]
cur.close()
conn.close()

if count == 0:
    print('[seed] Tabel kosong — seeding data awal...')
    exit(1)
else:
    print(f'[seed] Sudah ada {count} akun — skip seed.')
    exit(0)
"

SEED_NEEDED=$?
if [ $SEED_NEEDED -eq 1 ]; then
    echo "[entrypoint] 🌱 Menjalankan seed data awal via API internal..."
    python -c "
import os, asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import hashlib

DATABASE_URL = os.environ.get('DATABASE_URL')

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

import bcrypt
def hash_pwd(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

async def seed():
    async with AsyncSessionLocal() as db:
        try:
            # Buat 2 akun demo
            r = await db.execute(text('''
                INSERT INTO accounts (email, password_hash, tier) VALUES
                (:e1, :h1, 'free'),
                (:e2, :h2, 'paid')
                ON CONFLICT DO NOTHING
                RETURNING id, email
            '''), {
                'e1': 'pak-ahmad@example.com', 'h1': hash_pwd('password_tes_123'),
                'e2': 'bu-siti@example.com',   'h2': hash_pwd('password_tes_123'),
            })
            rows = r.fetchall()
            if not rows:
                print('[seed] Akun sudah ada, skip.')
                return

            # Buat 2 project
            await db.execute(text('''
                INSERT INTO projects (name) VALUES
                ('Monitoring Kebun Greenhouse'),
                ('Smart Home Siti')
                ON CONFLICT DO NOTHING
            '''))

            # Ambil ID
            acc_r = await db.execute(text(\"SELECT id FROM accounts ORDER BY id LIMIT 2\"))
            acc_ids = [r[0] for r in acc_r.fetchall()]
            proj_r = await db.execute(text(\"SELECT id FROM projects ORDER BY id LIMIT 2\"))
            proj_ids = [r[0] for r in proj_r.fetchall()]

            if len(acc_ids) < 2 or len(proj_ids) < 2:
                print('[seed] Data tidak cukup, skip membuat relasi.')
                return

            # Project members
            await db.execute(text('''
                INSERT INTO project_members (project_id, account_id, role) VALUES
                (:p1, :a1, 'owner'), (:p2, :a2, 'owner')
                ON CONFLICT DO NOTHING
            '''), {'p1': proj_ids[0], 'a1': acc_ids[0], 'p2': proj_ids[1], 'a2': acc_ids[1]})

            # Devices
            key1 = hashlib.sha256(b'key_greenhouse_123').hexdigest()
            key2 = hashlib.sha256(b'key_smarthome_456').hexdigest()
            await db.execute(text('''
                INSERT INTO devices (project_id, name, api_key_hash) VALUES
                (:p1, 'Sensor Suhu Kebun', :k1),
                (:p2, 'Sensor AC Smarthome', :k2)
                ON CONFLICT DO NOTHING
            '''), {'p1': proj_ids[0], 'k1': key1, 'p2': proj_ids[1], 'k2': key2})

            # Data channels
            dev_r = await db.execute(text(\"SELECT id FROM devices ORDER BY id LIMIT 2\"))
            dev_ids = [r[0] for r in dev_r.fetchall()]
            if dev_ids:
                await db.execute(text('''
                    INSERT INTO data_channels (device_id, name, channel_type, unit) VALUES
                    (:d1, 'temperature', 'numeric', '°C'),
                    (:d1, 'humidity',    'numeric', '%'),
                    (:d1, 'relay_1',     'boolean', NULL),
                    (:d2, 'temperature', 'numeric', '°C'),
                    (:d2, 'humidity',    'numeric', '%')
                    ON CONFLICT DO NOTHING
                '''), {'d1': dev_ids[0], 'd2': dev_ids[1]})

            await db.commit()
            print('[seed] ✅ Seed data berhasil!')
        except Exception as e:
            await db.rollback()
            print(f'[seed] ⚠️ Error saat seed: {e}')

asyncio.run(seed())
"
    echo "[entrypoint] ✅ Seed selesai!"
else
    echo "[entrypoint] ℹ️  Data sudah ada, skip seed."
fi

echo ""
echo "[entrypoint] 🚀 Memulai FastAPI server..."
echo ""

# ── 4. Start FastAPI dengan Uvicorn ─────────────────────────────────────────
exec uvicorn demo_app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --log-level info
