"""Real, multi-tenant Yugma IoT API. It intentionally contains no demo mode."""
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import dotenv
import redis.asyncio as aioredis
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv.load_dotenv(os.path.join(ROOT, ".env"))
DATABASE_URL, REDIS_URL, SECRET_KEY = (os.environ[k] for k in ("DATABASE_URL", "REDIS_URL", "SECRET_KEY"))
ALGORITHM, TOKEN_MINUTES = os.getenv("JWT_ALGORITHM", "HS256"), int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
passwords, oauth = CryptContext(schemes=["bcrypt"], deprecated="auto"), OAuth2PasswordBearer(tokenUrl="/api/auth/login")

app = FastAPI(title="Yugma IoT API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
class ProjectInput(BaseModel): name: str = Field(min_length=3, max_length=120)
class DeviceInput(BaseModel): name: str = Field(min_length=2, max_length=120)
class ChannelInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    channel_type: Literal["numeric", "boolean", "string"] = "numeric"
    unit: str | None = Field(default=None, max_length=24)
class MemberInput(BaseModel): email: EmailStr
class DashboardInput(BaseModel): widgets: list[dict] = Field(default_factory=list)
class TelemetryInput(BaseModel):
    protocol: Literal["HTTP", "MQTT", "CoAP", "http", "mqtt", "coap"]
    api_key: str = Field(min_length=16, max_length=255)
    data: dict

async def database():
    async with Session() as db: yield db
async def redis_connection():
    client = aioredis.from_url(REDIS_URL, decode_responses=True)
    try: yield client
    finally: await client.aclose()
def make_token(account_id: int, email: str):
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(account_id), "account_id": account_id, "email": email, "iat": now, "exp": now + timedelta(minutes=TOKEN_MINUTES)}, SECRET_KEY, algorithm=ALGORITHM)
async def account(token: str = Depends(oauth), db: AsyncSession = Depends(database)):
    try: account_id = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]).get("account_id")
    except JWTError as exc: raise HTTPException(401, "Sesi tidak valid atau telah berakhir.") from exc
    row = (await db.execute(text("SELECT id, email, tier, created_at FROM accounts WHERE id=:id AND deleted_at IS NULL"), {"id": account_id})).mappings().first()
    if not row: raise HTTPException(401, "Sesi tidak valid atau telah berakhir.")
    return row
async def member(project_id: int, account_id: int, db: AsyncSession, owner=False):
    row = (await db.execute(text("""SELECT pm.role FROM project_members pm JOIN projects p ON p.id=pm.project_id
        WHERE pm.project_id=:project_id AND pm.account_id=:account_id AND p.deleted_at IS NULL"""), {"project_id": project_id, "account_id": account_id})).mappings().first()
    if not row: raise HTTPException(404, "Project tidak ditemukan atau Anda bukan anggota.")
    if owner and row["role"] != "owner": raise HTTPException(403, "Hanya ketua project yang dapat melakukan tindakan ini.")
    return row["role"]
def rows(result): return [dict(row) for row in result.mappings().all()]

@app.get("/api/status")
async def api_status(db: AsyncSession = Depends(database), redis=Depends(redis_connection)):
    await db.execute(text("SELECT 1")); await redis.ping()
    return {"status": "ok", "postgres": "connected", "redis": "connected"}
@app.post("/api/auth/register", status_code=201)
async def register(payload: Credentials, db: AsyncSession = Depends(database)):
    try:
        user = (await db.execute(text("INSERT INTO accounts (email,password_hash,tier) VALUES (:email,:password,'free') RETURNING id,email"), {"email": str(payload.email).lower(), "password": passwords.hash(payload.password)})).mappings().one()
        await db.commit()
    except IntegrityError as exc:
        await db.rollback(); raise HTTPException(409, "Email sudah terdaftar. Silakan masuk.") from exc
    return {"access_token": make_token(user["id"], user["email"]), "token_type": "bearer", "expires_in": TOKEN_MINUTES * 60}
@app.post("/api/auth/login")
async def login(payload: Credentials, db: AsyncSession = Depends(database)):
    user = (await db.execute(text("SELECT id,email,password_hash FROM accounts WHERE lower(email)=:email AND deleted_at IS NULL"), {"email": str(payload.email).lower()})).mappings().first()
    if not user or not passwords.verify(payload.password, user["password_hash"]): raise HTTPException(401, "Email atau password salah.")
    return {"access_token": make_token(user["id"], user["email"]), "token_type": "bearer", "expires_in": TOKEN_MINUTES * 60}
@app.get("/api/auth/me")
async def me(current=Depends(account)): return dict(current)

@app.get("/api/v2/projects")
async def list_projects(current=Depends(account), db: AsyncSession = Depends(database)):
    result = await db.execute(text("""SELECT p.id,p.name,p.created_at,pm.role FROM projects p JOIN project_members pm ON pm.project_id=p.id
        WHERE pm.account_id=:id AND p.deleted_at IS NULL ORDER BY p.created_at DESC"""), {"id": current["id"]})
    return {"data": rows(result)}
@app.post("/api/v2/projects", status_code=201)
async def create_project(payload: ProjectInput, current=Depends(account), db: AsyncSession = Depends(database)):
    if current["tier"] == "free":
        count = (await db.execute(text("SELECT count(*) FROM project_members WHERE account_id=:id AND role='owner'"), {"id": current["id"]})).scalar_one()
        if count >= 2: raise HTTPException(402, "Paket Free maksimal dua project. Upgrade untuk membuat project tambahan.")
    try:
        project = (await db.execute(text("INSERT INTO projects (name) VALUES (:name) RETURNING id,name,created_at"), {"name": payload.name.strip()})).mappings().one()
        await db.execute(text("INSERT INTO project_members (project_id,account_id,role) VALUES (:project,:account,'owner')"), {"project": project["id"], "account": current["id"]})
        await db.execute(text("INSERT INTO project_dashboards (project_id,widgets) VALUES (:id,'[]'::jsonb)"), {"id": project["id"]})
        await db.commit()
    except Exception:
        await db.rollback(); raise
    return {"data": {**dict(project), "role": "owner"}}
@app.delete("/api/v2/projects/{project_id}", status_code=204)
async def delete_project(project_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db, True); await db.execute(text("UPDATE projects SET deleted_at=now() WHERE id=:id"), {"id": project_id}); await db.commit()

@app.get("/api/v2/projects/{project_id}/members")
async def list_members(project_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db)
    result = await db.execute(text("""SELECT a.id,a.email,a.tier,pm.role,pm.created_at FROM project_members pm JOIN accounts a ON a.id=pm.account_id
        WHERE pm.project_id=:project AND a.deleted_at IS NULL ORDER BY CASE pm.role WHEN 'owner' THEN 0 ELSE 1 END,a.email"""), {"project": project_id})
    return {"data": rows(result)}
@app.post("/api/v2/projects/{project_id}/members", status_code=201)
async def add_member(project_id: int, payload: MemberInput, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db, True)
    if current["tier"] != "paid": raise HTTPException(402, "Kolaborasi anggota tersedia pada paket Paid.")
    invited = (await db.execute(text("SELECT id FROM accounts WHERE lower(email)=:email AND deleted_at IS NULL"), {"email": str(payload.email).lower()})).mappings().first()
    if not invited: raise HTTPException(404, "Pengguna belum memiliki akun. Minta mereka mendaftar terlebih dahulu.")
    await db.execute(text("INSERT INTO project_members (project_id,account_id,role) VALUES (:project,:account,'collaborator') ON CONFLICT (project_id,account_id) DO NOTHING"), {"project": project_id, "account": invited["id"]}); await db.commit()
    return {"message": "Anggota berhasil ditambahkan."}
@app.delete("/api/v2/projects/{project_id}/members/{member_id}", status_code=204)
async def remove_member(project_id: int, member_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db, True); await db.execute(text("DELETE FROM project_members WHERE project_id=:project AND account_id=:account AND role='collaborator'"), {"project": project_id, "account": member_id}); await db.commit()

@app.get("/api/v2/projects/{project_id}/devices")
async def list_devices(project_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db)
    result = await db.execute(text("SELECT id,name,project_id,created_at FROM devices WHERE project_id=:project AND deleted_at IS NULL ORDER BY created_at DESC"), {"project": project_id})
    return {"data": rows(result)}
@app.post("/api/v2/projects/{project_id}/devices", status_code=201)
async def create_device(project_id: int, payload: DeviceInput, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db)
    if current["tier"] == "free":
        count = (await db.execute(text("SELECT count(*) FROM devices WHERE project_id=:id AND deleted_at IS NULL"), {"id": project_id})).scalar_one()
        if count >= 5: raise HTTPException(402, "Paket Free maksimal lima perangkat per project.")
    api_key = "ygm_live_" + secrets.token_urlsafe(32)
    row = (await db.execute(text("""INSERT INTO devices (project_id,name,api_key_hash) VALUES (:project,:name,:hash)
        RETURNING id,name,project_id,created_at"""), {"project": project_id, "name": payload.name.strip(), "hash": hashlib.sha256(api_key.encode()).hexdigest()})).mappings().one()
    await db.commit(); return {"data": {**dict(row), "api_key": api_key}}

async def device_project(device_id, current, db):
    device = (await db.execute(text("SELECT project_id FROM devices WHERE id=:id AND deleted_at IS NULL"), {"id": device_id})).mappings().first()
    if not device: raise HTTPException(404, "Perangkat tidak ditemukan.")
    await member(device["project_id"], current["id"], db); return device
@app.get("/api/v2/devices/{device_id}/channels")
async def list_channels(device_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await device_project(device_id, current, db)
    return {"data": rows(await db.execute(text("SELECT id,device_id,name,channel_type,unit FROM data_channels WHERE device_id=:id ORDER BY id"), {"id": device_id}))}
@app.post("/api/v2/devices/{device_id}/channels", status_code=201)
async def create_channel(device_id: int, payload: ChannelInput, current=Depends(account), db: AsyncSession = Depends(database)):
    await device_project(device_id, current, db)
    row = (await db.execute(text("""INSERT INTO data_channels (device_id,name,channel_type,unit) VALUES (:device_id,:name,:channel_type,:unit)
        RETURNING id,device_id,name,channel_type,unit"""), {"device_id": device_id, **payload.model_dump()})).mappings().one()
    await db.commit(); return {"data": dict(row)}

@app.get("/api/v2/projects/{project_id}/dashboard")
async def get_dashboard(project_id: int, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db)
    row = (await db.execute(text("SELECT widgets,updated_at FROM project_dashboards WHERE project_id=:id"), {"id": project_id})).mappings().first()
    return {"data": dict(row) if row else {"widgets": [], "updated_at": None}}
@app.put("/api/v2/projects/{project_id}/dashboard")
async def save_dashboard(project_id: int, payload: DashboardInput, current=Depends(account), db: AsyncSession = Depends(database)):
    await member(project_id, current["id"], db)
    await db.execute(text("""INSERT INTO project_dashboards (project_id,widgets) VALUES (:id,CAST(:widgets AS jsonb))
        ON CONFLICT (project_id) DO UPDATE SET widgets=EXCLUDED.widgets,updated_at=now()"""), {"id": project_id, "widgets": json.dumps(payload.widgets)})
    await db.commit(); return {"data": {"widgets": payload.widgets}}
@app.post("/api/v2/telemetry", status_code=202)
async def ingest(payload: TelemetryInput, db: AsyncSession = Depends(database)):
    device = (await db.execute(text("SELECT id,project_id FROM devices WHERE api_key_hash=:hash AND deleted_at IS NULL"), {"hash": hashlib.sha256(payload.api_key.encode()).hexdigest()})).mappings().first()
    if not device: raise HTTPException(401, "API key perangkat tidak valid.")
    await db.execute(text("""INSERT INTO telemetry_events (project_id,device_id,protocol,payload)
        VALUES (:project,:device,:protocol,CAST(:payload AS jsonb))"""), {"project": device["project_id"], "device": device["id"], "protocol": payload.protocol.upper(), "payload": json.dumps(payload.data)})
    await db.commit(); return {"accepted": True, "device_id": device["id"]}
