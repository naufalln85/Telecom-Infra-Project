import os
import json
import logging
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
import dotenv
import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("demo_app")

# Load environment variables dari file .env di root directory
# Karena file main.py ini berada di folder demo_app/, kita cari .env di parent folder (../.env)
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(parent_dir, ".env")
dotenv.load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
REDIS_URL = os.environ.get("REDIS_URL")
SECRET_KEY = os.environ.get("SECRET_KEY")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
SQLALCHEMY_ECHO = os.environ.get("SQLALCHEMY_ECHO", "false").lower() == "true"

if not DATABASE_URL or not REDIS_URL or not SECRET_KEY:
    raise RuntimeError(
        "DATABASE_URL, REDIS_URL, atau SECRET_KEY tidak ditemukan di .env!\n"
        f"Mencari file .env di: {env_path}\n"
        "Pastikan Anda telah men-generate file .env di root direktori."
    )

# Setup SQLAlchemy Async Engine
# Gunakan pool_pre_ping=True untuk memastikan koneksi yang mati di-reconect otomatis
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, echo=SQLALCHEMY_ECHO)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

from fastapi.middleware.cors import CORSMiddleware

# Setup FastAPI App
app = FastAPI(
    title="IoT Platform TIP - Demo Skema & Trigger Modul A",
    description="Aplikasi web sederhana untuk membuktikan jalannya database, triggers, views, dan cooldown Redis.",
    version="1.0.0"
)

# Enable CORS for Frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency untuk mendapatkan Database Session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Dependency untuk mendapatkan Redis client
async def get_redis():
    client = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.close()

# =============================================================================
# PYDANTIC SCHEMAS FOR API INPUT
# =============================================================================
class AccountCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    tier: str = "free"

class AccountLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class ProjectCreate(BaseModel):
    name: str
    owner_email: str

class DeviceCreate(BaseModel):
    project_id: int
    name: str
    api_key: str

class ChannelCreate(BaseModel):
    device_id: int
    name: str
    channel_type: str = "numeric"
    unit: Optional[str] = None

class AlertRuleCreate(BaseModel):
    project_id: int
    device_id: int
    channel_id: int
    operator: str
    threshold_value: float
    cooldown_seconds: int
    notification_channel_name: str

class NotificationChannelCreate(BaseModel):
    project_id: int
    name: str
    type: str = "telegram"
    config: Optional[dict] = None

class SensorPayload(BaseModel):
    device_id: int
    channel_name: str
    value: float

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)

def create_access_token(subject: str, account_id: int, email: str) -> str:
    expires_delta = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,
        "account_id": account_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_account(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah kedaluwarsa.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        account_id = payload.get("account_id")
        if account_id is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    result = await db.execute(
        text("""
            SELECT id, email, tier, created_at
            FROM accounts
            WHERE id = :id AND deleted_at IS NULL
        """),
        {"id": account_id},
    )
    account = result.fetchone()
    if not account:
        raise credentials_error
    return account

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/api/status")
async def get_status(db: AsyncSession = Depends(get_db), redis_client = Depends(get_redis)):
    """Cek koneksi ke PostgreSQL dan Redis."""
    db_ok = False
    redis_ok = False
    db_error = ""
    redis_error = ""

    # Cek PostgreSQL
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_ok = True
    except Exception as e:
        db_error = str(e)

    # Cek Redis
    try:
        pong = await redis_client.ping()
        if pong:
            redis_ok = True
    except Exception as e:
        redis_error = str(e)

    return {
        "postgres": {"status": "connected" if db_ok else "error", "details": db_error},
        "redis": {"status": "connected" if redis_ok else "error", "details": redis_error}
    }

@app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(account: AccountCreate, db: AsyncSession = Depends(get_db)):
    """Daftarkan akun baru dengan password bcrypt dan langsung kembalikan JWT."""
    email = account.email.lower()
    password_hash = hash_password(account.password)
    try:
        result = await db.execute(
            text("""
                INSERT INTO accounts (email, password_hash, tier)
                VALUES (:email, :password_hash, :tier)
                RETURNING id, email, tier;
            """),
            {"email": email, "password_hash": password_hash, "tier": account.tier},
        )
        row = result.fetchone()
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e)
        if "uq_accounts_active_email" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email tersebut sudah terdaftar dan masih aktif.",
            )
        raise HTTPException(status_code=400, detail="Data pendaftaran tidak valid.")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    access_token = create_access_token(subject=str(row[0]), account_id=row[0], email=row[1])
    return {
        "access_token": access_token,
        "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(payload: AccountLogin, db: AsyncSession = Depends(get_db)):
    """Login akun aktif memakai email dan password, lalu terbitkan JWT."""
    result = await db.execute(
        text("""
            SELECT id, email, password_hash
            FROM accounts
            WHERE lower(email) = lower(:email) AND deleted_at IS NULL
            LIMIT 1;
        """),
        {"email": payload.email},
    )
    account = result.fetchone()
    if not account or not verify_password(payload.password, account[2]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(account[0]), account_id=account[0], email=account[1])
    return {
        "access_token": access_token,
        "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }

@app.get("/api/auth/me")
async def get_me(current_account = Depends(get_current_account)):
    """Ambil profil akun dari JWT Bearer token."""
    return {
        "id": current_account[0],
        "email": current_account[1],
        "tier": current_account[2],
        "created_at": current_account[3].isoformat(),
    }


@app.post("/api/seed-mock")
async def seed_mock_data(db: AsyncSession = Depends(get_db)):
    """Seed data awal secara atomik untuk mempermudah pengetesan."""
    try:
        # Bersihkan data lama menggunakan TRUNCATE CASCADE
        await db.execute(text("""
            TRUNCATE alert_history, alert_rule_targets, notification_channels, alert_rules,
                     data_channels, devices, project_members, projects, accounts
            RESTART IDENTITY CASCADE;
        """))

        # 1. Buat dua Akun
        await db.execute(text("""
            INSERT INTO accounts (email, password_hash, tier) VALUES
            ('pak-ahmad@example.com', :hash_ahmad, 'free'),
            ('bu-siti@example.com', :hash_siti, 'paid');
        """), {
            "hash_ahmad": hash_password("password_tes_123"),
            "hash_siti": hash_password("password_tes_123"),
        })

        # 2. Buat dua Proyek
        await db.execute(text("""
            INSERT INTO projects (name) VALUES
            ('Monitoring Kebun Greenhouse'),
            ('Smart Smart-Home Siti');
        """))

        # 3. Hubungkan Owner ke Proyek (Tabel project_members)
        await db.execute(text("""
            INSERT INTO project_members (project_id, account_id, role) VALUES
            (1, 1, 'owner'), -- Ahmad owner Kebun
            (2, 2, 'owner'); -- Siti owner Smart-Home
        """))

        # 4. Buat Device
        # API Key Hash di-hash di DB menggunakan SHA-256 (di-simulasikan di seed)
        # Plaintext API key: key_greenhouse_123, key_smarthome_456
        await db.execute(text("""
            INSERT INTO devices (project_id, name, api_key_hash) VALUES
            (1, 'Sensor Suhu Kebun', '8a12dbe8a6bc943a4163ad4d5f2479e0bf529a674d812bd2608146700c0f9976'), -- hash of key_greenhouse_123
            (2, 'Sensor AC Smarthome', 'd4dfc9497d3dc71c32729a738a53e9a7852f6fbf03f6bb5fb108c4e402b8f8fa'); -- hash of key_smarthome_456
        """))

        # 5. Buat Data Channel
        await db.execute(text("""
            INSERT INTO data_channels (device_id, name, channel_type, unit) VALUES
            (1, 'temperature', 'numeric', '°C'),
            (1, 'door_open', 'boolean', NULL),
            (2, 'temperature', 'numeric', '°C');
        """))

        # 6. Buat Notification Channel (Telegram)
        await db.execute(text("""
            INSERT INTO notification_channels (project_id, account_id, name, type, config) VALUES
            (1, 1, 'Telegram Bot Kebun', 'telegram', '{"chat_id": "-100123", "bot_token": "encrypted_token_123"}'::jsonb),
            (2, 2, 'Telegram Bot Siti', 'telegram', '{"chat_id": "-100456", "bot_token": "encrypted_token_456"}'::jsonb);
        """))

        # 7. Buat Alert Rule (Suhu Kebun > 35°C, Cooldown 60 detik)
        await db.execute(text("""
            INSERT INTO alert_rules (project_id, device_id, channel_id, operator, threshold_value, cooldown_seconds) VALUES
            (1, 1, 1, '>', 35.0, 60);
        """))

        # 8. Sambungkan Rule ke Target Notifikasi
        await db.execute(text("""
            INSERT INTO alert_rule_targets (alert_rule_id, notification_channel_id, project_id) VALUES
            (1, 1, 1);
        """))

        await db.commit()
        return {"status": "success", "message": "Database berhasil di-seed dengan data mock."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal melakukan seeding: {str(e)}")


@app.get("/api/dashboard-data")
async def get_dashboard_data(db: AsyncSession = Depends(get_db)):
    """Ambil semua data tabel untuk ditampilkan di UI dashboard."""
    try:
        # Helper untuk format list of dict dari SQLAlchemy result
        async def fetch_all_as_dict(query_str: str):
            res = await db.execute(text(query_str))
            # SQLAlchemy 2.0 mapping/keys
            keys = res.keys()
            return [dict(zip(keys, row)) for row in res.fetchall()]

        accounts = await fetch_all_as_dict("SELECT id, email, tier, deleted_at FROM accounts ORDER BY id")
        projects = await fetch_all_as_dict("SELECT id, name, deleted_at FROM projects ORDER BY id")
        members = await fetch_all_as_dict("SELECT project_id, account_id, role FROM project_members ORDER BY project_id")
        devices = await fetch_all_as_dict("SELECT id, project_id, name, deleted_at FROM devices ORDER BY id")
        channels = await fetch_all_as_dict("SELECT id, device_id, name, channel_type, unit FROM data_channels ORDER BY id")
        rules = await fetch_all_as_dict("SELECT id, project_id, device_id, channel_id, operator, threshold_value, cooldown_seconds, is_active FROM alert_rules ORDER BY id")
        active_rules = await fetch_all_as_dict("SELECT * FROM active_alert_rules ORDER BY id")
        notif_channels = await fetch_all_as_dict("SELECT id, project_id, name, type, deleted_at FROM notification_channels ORDER BY id")
        history = await fetch_all_as_dict("SELECT id, alert_rule_id, project_id, device_id, channel_id, value_at_trigger, rule_snapshot, triggered_at FROM alert_history ORDER BY id DESC LIMIT 10")

        return {
            "accounts": accounts,
            "projects": projects,
            "members": members,
            "devices": devices,
            "channels": channels,
            "rules": rules,
            "active_rules": active_rules,
            "notif_channels": notif_channels,
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulate-telemetry")
async def simulate_telemetry(payload: SensorPayload, db: AsyncSession = Depends(get_db), redis_client = Depends(get_redis)):
    """Simulasi data sensor masuk dari device dan mengevaluasi Alert Rule."""
    try:
        device_id = payload.device_id
        channel_name = payload.channel_name
        value = payload.value

        logger.info(f"Simulasi data: Device={device_id}, Channel={channel_name}, Value={value}")

        # 1. Cari rule aktif menggunakan VIEW active_alert_rules
        # View ini otomatis memfilter: rule aktif, project/device aktif, dan channel numeric
        query = text("""
            SELECT ar.id, ar.project_id, ar.operator, ar.threshold_value, ar.cooldown_seconds
            FROM active_alert_rules ar
            JOIN data_channels dc ON dc.id = ar.channel_id
            WHERE ar.device_id = :device_id AND dc.name = :channel_name
        """)
        
        result = await db.execute(query, {"device_id": device_id, "channel_name": channel_name})
        rule = result.fetchone()

        if not rule:
            return {
                "matched": False,
                "action": "none",
                "message": f"Tidak ada alert rule yang aktif untuk Device {device_id} pada channel '{channel_name}'"
            }

        rule_id, project_id, operator, threshold_value, cooldown_seconds = rule

        # 2. Evaluasi operator threshold
        triggered = False
        if operator == ">" and value > threshold_value:
            triggered = True
        elif operator == "<" and value < threshold_value:
            triggered = True
        elif operator == ">=" and value >= threshold_value:
            triggered = True
        elif operator == "<=" and value <= threshold_value:
            triggered = True
        elif operator == "==" and value == threshold_value:
            triggered = True

        if not triggered:
            return {
                "matched": True,
                "rule_id": rule_id,
                "triggered": False,
                "action": "none",
                "message": f"Nilai {value} tidak memenuhi batas threshold {operator} {threshold_value}"
            }

        # 3. Alert Terpicu! Cek Cooldown di Redis
        cooldown_key = f"alert:cooldown:{rule_id}"
        # Gunakan Redis SET dengan NX (Not Exist) dan EX (Expire / TTL)
        # Jika key belum ada, Redis set key dan return True. Jika sudah ada, return None/False.
        cooldown_set = await redis_client.set(cooldown_key, 1, ex=cooldown_seconds, nx=True)

        if not cooldown_set:
            # Masih dalam masa cooldown, skip notifikasi & write history (anti-spam)
            ttl = await redis_client.ttl(cooldown_key)
            return {
                "matched": True,
                "rule_id": rule_id,
                "triggered": True,
                "cooldown": True,
                "action": "ignored_cooldown",
                "ttl_left_seconds": ttl,
                "message": f"Alert terpicu ({value} {operator} {threshold_value}), tetapi diabaikan karena masih COOLDOWN. Sisa waktu: {ttl} detik."
            }

        # 4. Jika lolos cooldown, catat ke alert_history
        # Kita hanya meng-insert alert_rule_id dan value_at_trigger.
        # Trigger 'trg_alert_history_context' di database PostgreSQL akan otomatis
        # mengisi project_id, device_id, channel_id, dan rule_snapshot!
        insert_query = text("""
            INSERT INTO alert_history (alert_rule_id, value_at_trigger)
            VALUES (:rule_id, :value)
            RETURNING id, project_id, device_id, channel_id, rule_snapshot;
        """)
        
        history_res = await db.execute(insert_query, {"rule_id": rule_id, "value": value})
        history_row = history_res.fetchone()
        await db.commit()

        history_id, db_project_id, db_device_id, db_channel_id, db_snapshot = history_row

        return {
            "matched": True,
            "rule_id": rule_id,
            "triggered": True,
            "cooldown": False,
            "action": "dispatched",
            "history": {
                "id": history_id,
                "project_id": db_project_id,
                "device_id": db_device_id,
                "channel_id": db_channel_id,
                "rule_snapshot": db_snapshot
            },
            "message": (
                f"ALERT BERHASIL TRIGGERED & DISPATCHED! "
                f"Nilai {value} {operator} {threshold_value} melanggar batas. "
                f"Database trigger 'trg_alert_history_context' otomatis mengisi snapshot audit: {json.dumps(db_snapshot)}."
            )
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/soft-delete-project/{project_id}")
async def soft_delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Simulasi Soft Delete Proyek untuk membuktikan trigger database."""
    try:
        # Update deleted_at di projects
        query = text("""
            UPDATE projects
            SET deleted_at = now()
            WHERE id = :project_id AND deleted_at IS NULL
            RETURNING id, deleted_at;
        """)
        result = await db.execute(query, {"project_id": project_id})
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=400,
                detail=f"Proyek {project_id} tidak ditemukan atau sudah dalam status terhapus."
            )

        await db.commit()

        return {
            "status": "success",
            "message": (
                f"Proyek {project_id} telah di-soft-delete. "
                "Trigger database 'trg_projects_soft_delete' otomatis men-soft-delete "
                "seluruh device, notification channel di bawahnya, dan menonaktifkan alert rules."
            )
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reset-project/{project_id}")
async def reset_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Kembalikan proyek dari soft delete (untuk mempermudah test berulang)."""
    try:
        # Set deleted_at = NULL pada project, devices, dan notif channels
        await db.execute(text("UPDATE projects SET deleted_at = NULL WHERE id = :pid"), {"pid": project_id})
        await db.execute(text("UPDATE devices SET deleted_at = NULL WHERE project_id = :pid"), {"pid": project_id})
        await db.execute(text("UPDATE notification_channels SET deleted_at = NULL WHERE project_id = :pid"), {"pid": project_id})
        # Aktifkan kembali rule
        await db.execute(text("UPDATE alert_rules SET is_active = true WHERE project_id = :pid"), {"pid": project_id})
        
        await db.commit()
        return {"status": "success", "message": f"Status proyek {project_id} berhasil di-restore kembali aktif."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/accounts")
async def create_account(account: AccountCreate, db: AsyncSession = Depends(get_db)):
    """Uji coba mendaftarkan akun baru (membuktikan partial unique index)."""
    try:
        query = text("""
            INSERT INTO accounts (email, password_hash, tier)
            VALUES (:email, :hash, :tier)
            RETURNING id, email, tier, created_at;
        """)
        res = await db.execute(query, {
            "email": account.email.lower(),
            "hash": hash_password(account.password),
            "tier": account.tier
        })
        row = res.fetchone()
        await db.commit()

        return {
            "status": "success",
            "data": {
                "id": row[0],
                "email": row[1],
                "tier": row[2],
                "created_at": row[3].isoformat()
            }
        }
    except Exception as e:
        await db.rollback()
        # Jika PostgreSQL melempar unique violation (email sudah ada di antara akun aktif)
        error_msg = str(e)
        if "uq_accounts_active_email" in error_msg:
            raise HTTPException(
                status_code=400,
                detail="Pendaftaran ditolak: Email tersebut sudah terdaftar dan berstatus AKTIF."
            )
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/accounts/soft-delete/{account_id}")
async def soft_delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    """Soft delete akun (untuk membuktikan email yang sama bisa daftar lagi jika akun lama terhapus)."""
    try:
        query = text("""
            UPDATE accounts
            SET deleted_at = now()
            WHERE id = :aid AND deleted_at IS NULL
            RETURNING id, email, deleted_at;
        """)
        res = await db.execute(query, {"aid": account_id})
        row = res.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Akun tidak ditemukan atau sudah terhapus.")
        await db.commit()
        return {"status": "success", "message": f"Akun {row[1]} berhasil di-soft-delete."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# V1 REST API ENDPOINTS (MODUL A API SPECIFICATION)
# =============================================================================

@app.get("/api/v1/projects")
async def list_v1_projects(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("""
            SELECT id, name, created_at, deleted_at
            FROM projects
            WHERE deleted_at IS NULL
            ORDER BY id ASC;
        """))
        projects = [dict(zip(result.keys(), row)) for row in result.fetchall()]
        return {"data": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/projects", status_code=status.HTTP_201_CREATED)
async def create_v1_project(payload: dict, db: AsyncSession = Depends(get_db)):
    name = payload.get("name")
    if not name or len(name) < 3:
        raise HTTPException(status_code=400, detail="Nama project minimal 3 karakter.")
    try:
        res = await db.execute(text("""
            INSERT INTO projects (name) VALUES (:name) RETURNING id, name, created_at;
        """), {"name": name})
        row = res.fetchone()
        await db.commit()
        return {
            "message": "Proyek berhasil dibuat",
            "data": {"id": row[0], "name": row[1], "role_saya": "owner", "created_at": row[2].isoformat()}
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/projects/{project_id}")
async def delete_v1_project(project_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            UPDATE projects SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL RETURNING id;
        """), {"id": project_id})
        if not res.fetchone():
            raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
        await db.commit()
        return {"message": "Proyek dipindahkan ke recycle bin."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/projects/{project_id}/devices")
async def list_v1_devices(project_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            SELECT id, name, project_id, created_at FROM devices WHERE project_id = :pid AND deleted_at IS NULL;
        """), {"pid": project_id})
        devices = [dict(zip(res.keys(), row)) for row in res.fetchall()]
        return {"data": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/projects/{project_id}/devices", status_code=status.HTTP_201_CREATED)
async def create_v1_device(project_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    name = payload.get("name", "New Sensor Node")
    import hashlib
    raw_api_key = f"tip_live_{os.urandom(12).hex()}"
    key_hash = hashlib.sha256(raw_api_key.encode()).hexdigest()
    try:
        res = await db.execute(text("""
            INSERT INTO devices (project_id, name, api_key_hash) VALUES (:pid, :name, :hash) RETURNING id, name, created_at;
        """), {"pid": project_id, "name": name, "hash": key_hash})
        row = res.fetchone()
        await db.commit()
        return {
            "message": "Perangkat berhasil didaftarkan.",
            "data": {"id": row[0], "name": row[1], "api_key": raw_api_key}
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/devices/{device_id}/channels")
async def list_v1_channels(device_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            SELECT id, device_id, name, channel_type, unit FROM data_channels WHERE device_id = :did;
        """), {"did": device_id})
        channels = [dict(zip(res.keys(), row)) for row in res.fetchall()]
        return {"data": channels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/devices/{device_id}/channels", status_code=status.HTTP_201_CREATED)
async def create_v1_channel(device_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    name = payload.get("name")
    ch_type = payload.get("channel_type", "numeric")
    unit = payload.get("unit")
    try:
        res = await db.execute(text("""
            INSERT INTO data_channels (device_id, name, channel_type, unit)
            VALUES (:did, :name, :type, :unit)
            RETURNING id, device_id, name, channel_type, unit;
        """), {"did": device_id, "name": name, "type": ch_type, "unit": unit})
        row = res.fetchone()
        await db.commit()
        return {
            "message": "Kanal sensor berhasil ditambahkan",
            "data": {"id": row[0], "device_id": row[1], "name": row[2], "channel_type": row[3], "unit": row[4]}
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/projects/{project_id}/rules")
async def list_v1_rules(project_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            SELECT ar.id, d.name as device_name, dc.name as channel_name, ar.operator, ar.threshold_value, ar.cooldown_seconds, ar.is_active
            FROM alert_rules ar
            JOIN devices d ON d.id = ar.device_id
            JOIN data_channels dc ON dc.id = ar.channel_id
            WHERE ar.project_id = :pid;
        """), {"pid": project_id})
        rules = [dict(zip(res.keys(), row)) for row in res.fetchall()]
        return {"data": rules}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/projects/{project_id}/alerts/history")
async def list_v1_alert_history(project_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            SELECT id as history_id, alert_rule_id, device_id, channel_id, value_at_trigger, rule_snapshot, triggered_at
            FROM alert_history
            WHERE project_id = :pid
            ORDER BY triggered_at DESC
            LIMIT 50;
        """), {"pid": project_id})
        history = [dict(zip(res.keys(), row)) for row in res.fetchall()]
        return {"data": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/projects/{project_id}/notifications/channels")
async def list_v1_notif_channels(project_id: int, db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("""
            SELECT id, project_id, name, type, config, created_at FROM notification_channels WHERE project_id = :pid AND deleted_at IS NULL;
        """), {"pid": project_id})
        notifs = [dict(zip(res.keys(), row)) for row in res.fetchall()]
        return {"data": notifs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serves dashboard index.html frontend
@app.get("/", response_class=HTMLResponse)
async def get_index():
    templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
    html_path = os.path.join(templates_dir, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()

# Setup static files directory (untuk bootstrap, css, dll. jika ada)
# Tapi di dashboard kita gunakan CDN agar instalasi di VM tidak butuh unduh static files lokal
