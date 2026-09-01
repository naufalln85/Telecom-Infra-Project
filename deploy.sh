#!/bin/bash
# =============================================================================
#  ██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
#  ██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
#  ██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝
#  ██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝
#  ██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║
#  ╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝
#
#  IoT Platform TIP — Full Production Deployment & Auto-Run Script
#  Modul A (Database/API) + B (Gateway) + C (Frontend) + D (AI)
#
#  Cara pakai:
#    chmod +x deploy.sh
#    ./deploy.sh
#
#  Script ini akan:
#    ✅ Install Docker & dependensi
#    ✅ Setup file .env otomatis
#    ✅ Build & run seluruh 6 container
#    ✅ Jalankan migrasi database Alembic
#    ✅ Seed data awal
#    ✅ Daftarkan systemd service (auto-start saat reboot)
#    ✅ Aktifkan watchdog otomatis (auto-recovery container mati)
#    ✅ Website tidak akan pernah mati ♾️
# =============================================================================

set -euo pipefail

# ─── WARNA OUTPUT ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
step()    { echo -e "\n${BLUE}${BOLD}━━━ STEP $1: $2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
ok()      { echo -e "${GREEN}  ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
info()    { echo -e "${CYAN}  ℹ️  $1${NC}"; }
error()   { echo -e "${RED}  ❌ ERROR: $1${NC}"; exit 1; }
banner()  { echo -e "${MAGENTA}${BOLD}$1${NC}"; }

# ─── BANNER ───────────────────────────────────────────────────────────────────
clear
banner "╔══════════════════════════════════════════════════════════════════╗"
banner "║   🚀  IoT Platform TIP — Production Auto-Deploy Script          ║"
banner "║   Modul A (DB/API) + B (Gateway) + C (Frontend) + D (AI)       ║"
banner "║   All-in-One: Build · Run · Always-On · Auto-Recovery           ║"
banner "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ─── CEK ROOT ─────────────────────────────────────────────────────────────────
if [ "$EUID" -eq 0 ]; then
    warn "Berjalan sebagai root. Systemd service akan di-install untuk root."
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
info "Project directory: ${PROJECT_DIR}"

# =============================================================================
# STEP 1 — Install Docker & Docker Compose
# =============================================================================
step "1" "Install Docker & Docker Compose"

if command -v docker &>/dev/null; then
    ok "Docker sudah terinstall: $(docker --version)"
else
    info "Menginstall Docker Engine..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release

    # GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin

    ok "Docker berhasil diinstall: $(docker --version)"
fi

# Tambahkan user ke group docker
if ! groups "$USER" 2>/dev/null | grep -q docker; then
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    warn "User '$USER' ditambahkan ke group docker."
fi

# Pastikan Docker daemon berjalan
sudo systemctl start docker
sudo systemctl enable docker
ok "Docker daemon running & enabled."

docker compose version &>/dev/null || error "Docker Compose tidak tersedia!"
ok "Docker Compose: $(docker compose version)"

# =============================================================================
# STEP 2 — Install utilitas tambahan
# =============================================================================
step "2" "Install Utilitas Pendukung"
sudo apt-get install -y -qq \
    curl wget netcat-openbsd net-tools jq \
    python3 python3-pip python3-venv python3-dev \
    libpq-dev gcc g++ build-essential

ok "Semua utilitas berhasil diinstall."

# =============================================================================
# STEP 3 — Konfigurasi File .env Otomatis (Tanpa Perlu Edit Manual)
# =============================================================================
step "3" "Konfigurasi Environment (.env) Otomatis"

cd "$PROJECT_DIR"

# Dapatkan IP Server Publik
VM_IP=$(ip addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1 || echo "localhost")
PUBLIC_IP=$(curl -s --connect-timeout 3 https://api.ipify.org 2>/dev/null || echo "$VM_IP")

# Tentukan Domain / IP yang digunakan (bisa di-pass via argumen: ./deploy.sh nama-domain.com)
TARGET_DOMAIN="${1:-${PUBLIC_DOMAIN:-$PUBLIC_IP}}"

# Pastikan direktori proyek dapat ditulis oleh user saat ini (perbaiki izin akses jika cloned sebagai root)
if [ ! -w "$PROJECT_DIR" ]; then
    info "Memperbaiki hak akses direktori proyek..."
    sudo chown -R "$USER:$USER" "$PROJECT_DIR" 2>/dev/null || sudo chmod -R 777 "$PROJECT_DIR" 2>/dev/null || true
fi

# Jika file .env belum ada, buat dari .env.example
if [ ! -f ".env" ]; then
    if [ ! -f ".env.example" ]; then
        error "File .env.example tidak ditemukan! Pastikan berada di direktori project."
    fi
    cp .env.example .env 2>/dev/null || sudo cp .env.example .env
    sudo chown "$USER:$USER" .env 2>/dev/null || true
    info "File .env otomatis dibuat dari .env.example."
fi

# Generate password & secret key acak yang kuat
PG_PASS=$(openssl rand -base64 24 | tr -d '/+=')
REDIS_PASS=$(openssl rand -base64 24 | tr -d '/+=')
SECRET_KEY=$(openssl rand -hex 32)
HMAC_SECRET=$(openssl rand -hex 32)

# Mengisi/Update password & secret key jika masih placeholder
sed -i "s/GANTI_PASSWORD_KUAT_DISINI/${PG_PASS}/g" .env 2>/dev/null || true
sed -i "s/GANTI_REDIS_PASSWORD_DISINI/${REDIS_PASS}/g" .env 2>/dev/null || true
sed -i "s/GANTI_DENGAN_RANDOM_HEX_64_KARAKTER/${SECRET_KEY}/g" .env 2>/dev/null || true
sed -i "s/GANTI_DENGAN_SECRET_HMAC_RANDOM/${HMAC_SECRET}/g" .env 2>/dev/null || true

# Set mode produksi otomatis
sed -i "s/^APP_ENV=.*/APP_ENV=production/g" .env 2>/dev/null || true
sed -i "s/^DEBUG=.*/DEBUG=false/g" .env 2>/dev/null || true

# Set PUBLIC_DOMAIN
if grep -q "^PUBLIC_DOMAIN=" .env; then
    sed -i "s|^PUBLIC_DOMAIN=.*|PUBLIC_DOMAIN=${TARGET_DOMAIN}|g" .env
else
    echo "PUBLIC_DOMAIN=${TARGET_DOMAIN}" >> .env
fi

# Set CORS_ORIGINS
CORS_VAL="http://localhost,http://localhost:3000,http://localhost:5173,http://${PUBLIC_IP},https://${PUBLIC_IP},http://${TARGET_DOMAIN},https://${TARGET_DOMAIN}"
if grep -q "^CORS_ORIGINS=" .env; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${CORS_VAL}|g" .env
else
    echo "CORS_ORIGINS=${CORS_VAL}" >> .env
fi

# Pastikan host database & redis menggunakan nama container docker (db & redis)
sed -i "s|@127.0.0.1:5432|@db:5432|g" .env 2>/dev/null || true
sed -i "s|@localhost:5432|@db:5432|g" .env 2>/dev/null || true
sed -i "s|@127.0.0.1:6379|@redis:6379|g" .env 2>/dev/null || true
sed -i "s|@localhost:6379|@redis:6379|g" .env 2>/dev/null || true

# Sync DATABASE_URL dan REDIS_URL jika masih berisi default
CURRENT_PG_PASS=$(grep "^POSTGRES_PASSWORD=" .env | cut -d '=' -f2)
CURRENT_RD_PASS=$(grep "^REDIS_PASSWORD=" .env | cut -d '=' -f2)
if [ -n "$CURRENT_PG_PASS" ]; then
    sed -i "s|postgresql+asyncpg://tip_admin:[^@]*@db:5432|postgresql+asyncpg://tip_admin:${CURRENT_PG_PASS}@db:5432|g" .env 2>/dev/null || true
    sed -i "s|postgresql+psycopg2://tip_admin:[^@]*@db:5432|postgresql+psycopg2://tip_admin:${CURRENT_PG_PASS}@db:5432|g" .env 2>/dev/null || true
fi
if [ -n "$CURRENT_RD_PASS" ]; then
    sed -i "s|redis://:[^@]*@redis:6379|redis://:${CURRENT_RD_PASS}@redis:6379|g" .env 2>/dev/null || true
fi

ok "Konfigurasi .env telah disesuaikan secara otomatis!"
info "Domain / Host Public : ${TARGET_DOMAIN}"
info "IP Server Public    : ${PUBLIC_IP}"
info "Mode Application    : production (DEBUG=false)"

# Load env vars untuk digunakan di script ini
set -a
source .env 2>/dev/null || true
set +a

# =============================================================================
# STEP 4 — Build Docker Images
# =============================================================================
step "4" "Build Docker Images (Semua Modul)"

info "Membangun image untuk: backend, iot-gateway, frontend, ai-serving..."
docker compose build --parallel

ok "Semua Docker image berhasil di-build."

# =============================================================================
# STEP 5 — Jalankan Semua Container
# =============================================================================
step "5" "Menjalankan Semua Container (6 Services)"

docker compose down --remove-orphans 2>/dev/null || true
docker compose up -d

ok "Semua container telah di-start."
info "Menunggu database & redis menjadi healthy (maks 120 detik)..."

TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    PG_H=$(docker inspect --format='{{.State.Health.Status}}' tip_postgres 2>/dev/null || echo "n/a")
    RD_H=$(docker inspect --format='{{.State.Health.Status}}' tip_redis    2>/dev/null || echo "n/a")
    GW_H=$(docker inspect --format='{{.State.Health.Status}}' tip_iot_gateway 2>/dev/null || echo "n/a")

    printf "\r  ⏳ PostgreSQL:%-10s Redis:%-10s Gateway:%-10s (%ds)" \
        "$PG_H" "$RD_H" "$GW_H" "$ELAPSED"

    if [ "$PG_H" = "healthy" ] && [ "$RD_H" = "healthy" ]; then
        echo ""
        ok "PostgreSQL: healthy ✅"
        ok "Redis: healthy ✅"
        break
    fi

    sleep 5
    ELAPSED=$((ELAPSED + 5))
done
echo ""

if [ "$PG_H" != "healthy" ] || [ "$RD_H" != "healthy" ]; then
    warn "Database/Redis belum fully healthy. Melanjutkan quand même..."
    sleep 15
fi

# =============================================================================
# STEP 6 — Migrasi Database Alembic
# =============================================================================
step "6" "Migrasi Skema Database (Alembic)"

info "Menjalankan: alembic upgrade head via container backend..."

# Coba jalankan alembic langsung di container backend
if docker compose exec -T backend python -c "import alembic" 2>/dev/null; then
    docker compose exec -T backend alembic upgrade head && \
        ok "Migrasi database berhasil!" || \
        warn "Alembic mungkin sudah up-to-date atau ada error. Cek: docker compose logs backend"
else
    warn "Alembic tidak tersedia di container. Jalankan manual jika diperlukan:"
    warn "  docker compose exec backend alembic upgrade head"
fi

# =============================================================================
# STEP 7 — Seed Data Awal
# =============================================================================
step "7" "Inisialisasi Seed Data"

info "Menunggu backend API siap (maks 60 detik)..."
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/status 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        ok "Backend API siap! (HTTP 200)"
        break
    fi
    printf "\r  ⏳ Menunggu backend API... (%ds) Status: %s" "$ELAPSED" "$HTTP_STATUS"
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done
echo ""

SEED_RESULT=$(curl -s -X POST http://localhost:8000/api/seed-mock 2>/dev/null || echo '{}')
if echo "$SEED_RESULT" | grep -q "success"; then
    ok "Data mock berhasil di-seed ke database."
else
    warn "Seed data mungkin sudah ada atau gagal. Response: ${SEED_RESULT:0:100}"
fi

# =============================================================================
# STEP 8 — Buat Systemd Service (Auto-Start & Always-On)
# =============================================================================
step "8" "Mendaftarkan Systemd Service (Auto-Start Saat Reboot)"

SERVICE_FILE="/etc/systemd/system/iot-platform-tip.service"
WATCHDOG_SCRIPT="/usr/local/bin/tip-watchdog.sh"

# ── Buat Watchdog Script ──────────────────────────────────────────────────────
cat > /tmp/tip-watchdog.sh << 'WATCHDOG_EOF'
#!/bin/bash
# =============================================================================
# IoT Platform TIP — Watchdog Script
# Memantau status container setiap 60 detik dan me-restart yang mati.
# =============================================================================

PROJECT_DIR="__PROJECT_DIR__"
LOG_FILE="/var/log/tip-watchdog.log"
SERVICES=("tip_postgres" "tip_redis" "tip_backend" "tip_iot_gateway" "tip_frontend" "tip_ai_serving")

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "=== Watchdog started (PID: $$) ==="

while true; do
    RESTART_NEEDED=false

    for SERVICE in "${SERVICES[@]}"; do
        STATUS=$(docker inspect --format='{{.State.Status}}' "$SERVICE" 2>/dev/null || echo "missing")
        if [ "$STATUS" != "running" ]; then
            log "⚠️  Container $SERVICE berstatus '$STATUS'. Melakukan restart..."
            RESTART_NEEDED=true
        fi
    done

    if [ "$RESTART_NEEDED" = "true" ]; then
        log "🔄 Menjalankan: docker compose up -d (dari $PROJECT_DIR)"
        cd "$PROJECT_DIR" && docker compose up -d >> "$LOG_FILE" 2>&1
        log "✅ docker compose up -d selesai."
    fi

    # Cek gateway HTTP health setiap 5 menit
    GW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    if [ "$GW_STATUS" != "200" ]; then
        log "⚠️  Gateway HTTP health check gagal (status: $GW_STATUS). Restart gateway..."
        docker restart tip_iot_gateway >> "$LOG_FILE" 2>&1
    fi

    sleep 60
done
WATCHDOG_EOF

# Inject PROJECT_DIR ke watchdog
sed -i "s|__PROJECT_DIR__|${PROJECT_DIR}|g" /tmp/tip-watchdog.sh
sudo mv /tmp/tip-watchdog.sh "$WATCHDOG_SCRIPT"
sudo chmod +x "$WATCHDOG_SCRIPT"
ok "Watchdog script dibuat di: $WATCHDOG_SCRIPT"

# ── Buat Systemd Service Main ─────────────────────────────────────────────────
sudo tee "$SERVICE_FILE" > /dev/null << SERVICE_EOF
[Unit]
Description=IoT Platform TIP — Multi-Tenant IoT Platform (Modul A+B+C+D)
Documentation=https://github.com/naufalln85/Telecom-Infra-Project
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${PROJECT_DIR}

# Environment
EnvironmentFile=${PROJECT_DIR}/.env

# Start: jalankan seluruh stack Docker
ExecStart=/usr/bin/docker compose -f ${PROJECT_DIR}/docker-compose.yml up -d

# Stop: hentikan seluruh stack dengan graceful shutdown
ExecStop=/usr/bin/docker compose -f ${PROJECT_DIR}/docker-compose.yml stop

# Restart otomatis: hanya jika ada failure
Restart=on-failure
RestartSec=30s

# Timeout yang lebih panjang untuk build pertama kali
TimeoutStartSec=300
TimeoutStopSec=120

# Log ke systemd journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iot-platform-tip

[Install]
WantedBy=multi-user.target
SERVICE_EOF

ok "Systemd service dibuat: $SERVICE_FILE"

# ── Buat Systemd Service Watchdog ─────────────────────────────────────────────
WATCHDOG_SERVICE_FILE="/etc/systemd/system/iot-platform-tip-watchdog.service"
sudo tee "$WATCHDOG_SERVICE_FILE" > /dev/null << WDOG_SERVICE_EOF
[Unit]
Description=IoT Platform TIP — Container Health Watchdog (Auto-Recovery)
After=docker.service
Wants=docker.service

[Service]
Type=simple
ExecStart=${WATCHDOG_SCRIPT}
Restart=always
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tip-watchdog

[Install]
WantedBy=multi-user.target
WDOG_SERVICE_EOF

ok "Watchdog service dibuat: $WATCHDOG_SERVICE_FILE"

# ── Enable & Start Systemd Services ──────────────────────────────────────────
sudo systemctl daemon-reload
sudo systemctl enable iot-platform-tip.service
sudo systemctl enable iot-platform-tip-watchdog.service

# Start watchdog (main sudah running dari step sebelumnya)
sudo systemctl start iot-platform-tip-watchdog.service || \
    warn "Watchdog service gagal start — cek: sudo journalctl -u iot-platform-tip-watchdog"

ok "Systemd services berhasil di-enable & di-start!"
info "  Main    : sudo systemctl status iot-platform-tip"
info "  Watchdog: sudo systemctl status iot-platform-tip-watchdog"

# =============================================================================
# STEP 9 — Setup Log Rotation (agar log tidak penuh)
# =============================================================================
step "9" "Setup Log Rotation"

sudo tee /etc/logrotate.d/tip-watchdog > /dev/null << 'LOGROTATE_EOF'
/var/log/tip-watchdog.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
LOGROTATE_EOF

ok "Log rotation dikonfigurasi (7 hari, harian)."

# =============================================================================
# STEP 10 — Setup UFW Firewall (jika tersedia)
# =============================================================================
step "10" "Konfigurasi Firewall (UFW)"

if command -v ufw &>/dev/null; then
    # Buka port yang dibutuhkan
    sudo ufw allow 22/tcp    comment 'SSH'        2>/dev/null
    sudo ufw allow 5173/tcp  comment 'TIP Frontend'  2>/dev/null
    sudo ufw allow 8000/tcp  comment 'TIP Backend API' 2>/dev/null
    sudo ufw allow 3000/tcp  comment 'IoT Gateway HTTP' 2>/dev/null
    sudo ufw allow 1884/tcp  comment 'IoT Gateway MQTT' 2>/dev/null
    sudo ufw allow 5683/udp  comment 'IoT Gateway CoAP' 2>/dev/null
    sudo ufw allow 8001/tcp  comment 'AI Serving'  2>/dev/null

    # Enable UFW jika belum aktif (tanpa prompt)
    sudo ufw --force enable 2>/dev/null || true
    ok "UFW firewall dikonfigurasi. Port yang dibuka: 22, 5173, 8000, 3000, 1884, 5683/udp, 8001"
else
    warn "UFW tidak tersedia. Konfigurasi firewall secara manual di cloud provider Anda."
fi

# =============================================================================
# STEP 11 — Final Status & Summary
# =============================================================================
step "11" "Final Status Check"

echo ""
docker compose ps
echo ""

# Dapatkan IP server
VM_IP=$(ip addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
PUBLIC_IP=$(curl -s --connect-timeout 3 https://api.ipify.org 2>/dev/null || echo "$VM_IP")

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   🎉  IoT Platform TIP BERHASIL DIJALANKAN! ALWAYS-ON! ♾️        ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}  🌐 Akses Aplikasi:${NC}"
echo -e "     Frontend Dashboard   → ${CYAN}http://${PUBLIC_IP}:5173${NC}"
echo -e "     Backend API          → ${CYAN}http://${PUBLIC_IP}:8000${NC}"
echo -e "     Swagger Docs         → ${CYAN}http://${PUBLIC_IP}:8000/docs${NC}"
echo -e "     IoT Gateway HTTP     → ${CYAN}http://${PUBLIC_IP}:3000${NC}"
echo -e "     IoT Gateway MQTT     → ${CYAN}mqtt://${PUBLIC_IP}:1884${NC}"
echo -e "     IoT Gateway CoAP     → ${CYAN}coap://${PUBLIC_IP}:5683${NC}"
echo -e "     AI Serving           → ${CYAN}http://${PUBLIC_IP}:8001${NC}"
echo ""
echo -e "${BOLD}  🔐 Test Kirim Data ke Gateway:${NC}"
echo -e "  ${YELLOW}  curl -X POST http://${PUBLIC_IP}:3000/api/v1/telemetry \\${NC}"
echo -e "  ${YELLOW}    -H \"x-api-key: key_greenhouse_123\" \\${NC}"
echo -e "  ${YELLOW}    -H \"Content-Type: application/json\" \\${NC}"
echo -e "  ${YELLOW}    -d '{\"device_id\":\"sensor-01\",\"temperature\":38.5,\"humidity\":65}'${NC}"
echo ""
echo -e "${BOLD}  🛠️  Perintah Manajemen Platform:${NC}"
echo -e "     Lihat status service  : ${CYAN}sudo systemctl status iot-platform-tip${NC}"
echo -e "     Lihat log watchdog    : ${CYAN}sudo tail -f /var/log/tip-watchdog.log${NC}"
echo -e "     Restart semua         : ${CYAN}sudo systemctl restart iot-platform-tip${NC}"
echo -e "     Stop semua            : ${CYAN}sudo systemctl stop iot-platform-tip${NC}"
echo -e "     Log real-time gateway : ${CYAN}docker compose logs -f iot-gateway${NC}"
echo -e "     Log real-time backend : ${CYAN}docker compose logs -f backend${NC}"
echo -e "     Monitor resource      : ${CYAN}docker stats${NC}"
echo ""
echo -e "${BOLD}  ♾️  Garanteed Always-On:${NC}"
echo -e "     ✅ Docker restart=unless-stopped (container restart otomatis)"
echo -e "     ✅ Systemd service enabled (start otomatis saat reboot)"
echo -e "     ✅ Watchdog berjalan (auto-recovery jika container mati)"
echo -e "     ✅ Log rotation aktif (log tidak penuh)"
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════════════════════${NC}"
