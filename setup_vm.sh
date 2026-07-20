#!/bin/bash
# =============================================================================
# SCRIPT SETUP OTOMATIS — IoT Platform TIP
# VM Ubuntu 22.04 / 24.04 LTS
#
# Cara pakai:
#   chmod +x setup_vm.sh
#   ./setup_vm.sh
#
# Script ini akan:
#   1. Install Docker & Docker Compose
#   2. Install Python3 & dependensi build
#   3. Setup virtual environment Python
#   4. Install requirements
#   5. Jalankan container Docker (PostgreSQL + Redis)
#   6. Jalankan migrasi Alembic
# =============================================================================

set -e  # Hentikan jika ada error

# Warna output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================
# FUNGSI HELPER
# ============================
print_step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  STEP $1: $2${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_ok() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ ERROR: $1${NC}"
}

print_info() {
    echo -e "${CYAN}  ℹ️  $1${NC}"
}

# ============================
# BANNER
# ============================
echo -e "${CYAN}"
echo "  ██╗ ██████╗ ████████╗    ██████╗ ██╗      █████╗ ████████╗███████╗ ██████╗ ██████╗ ███╗   ███╗"
echo "  ██║██╔═══██╗╚══██╔══╝    ██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗████╗ ████║"
echo "  ██║██║   ██║   ██║       ██████╔╝██║     ███████║   ██║   █████╗  ██║   ██║██████╔╝██╔████╔██║"
echo "  ██║██║   ██║   ██║       ██╔═══╝ ██║     ██╔══██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║"
echo "  ██║╚██████╔╝   ██║       ██║     ███████╗██║  ██║   ██║   ██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║"
echo "  ╚═╝ ╚═════╝    ╚═╝       ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝"
echo -e "${NC}"
echo -e "${GREEN}  IoT Platform TIP — Setup Otomatis VM Ubuntu${NC}"
echo -e "  Script ini akan menyiapkan semua kebutuhan infrastruktur di VM kamu.\n"

# ============================
# CEK: Root atau sudo?
# ============================
if [ "$EUID" -eq 0 ]; then
    print_warn "Script berjalan sebagai root. Disarankan jalankan sebagai user biasa dengan sudo."
fi

# ============================
# STEP 0: Cek OS
# ============================
print_step "0" "Cek Sistem Operasi"
OS=$(lsb_release -si 2>/dev/null || echo "Unknown")
VER=$(lsb_release -sr 2>/dev/null || echo "Unknown")
print_info "OS: $OS $VER"

if [[ "$OS" != "Ubuntu" ]]; then
    print_warn "Script ini dioptimalkan untuk Ubuntu. Mungkin ada perbedaan di OS lain."
fi

# ============================
# STEP 1: Update system packages
# ============================
print_step "1" "Update Package List"
sudo apt update -qq
print_ok "Package list diperbarui."

# ============================
# STEP 2: Install Docker
# ============================
print_step "2" "Install Docker & Docker Compose"

if command -v docker &> /dev/null; then
    print_ok "Docker sudah terinstall: $(docker --version)"
else
    print_info "Menginstall Docker..."

    # Install dependensi
    sudo apt install -y -qq \
        ca-certificates curl gnupg \
        apt-transport-https software-properties-common

    # Tambahkan GPG key Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Tambahkan repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    sudo apt update -qq
    sudo apt install -y -qq docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin

    print_ok "Docker berhasil diinstall: $(docker --version)"
fi

# Tambahkan user ke group docker (jika belum)
if ! groups "$USER" | grep -q docker; then
    sudo usermod -aG docker "$USER"
    print_warn "User '$USER' ditambahkan ke group 'docker'."
    print_warn "Jalankan: newgrp docker  — agar perubahan langsung berlaku di sesi ini."
fi

# Verifikasi Docker Compose
if docker compose version &> /dev/null; then
    print_ok "Docker Compose: $(docker compose version)"
else
    print_error "Docker Compose tidak ditemukan!"
    exit 1
fi

# ============================
# STEP 3: Install Python & build tools
# ============================
print_step "3" "Install Python3, pip, dan Build Tools"

sudo apt install -y -qq \
    python3 python3-pip python3-venv python3-dev \
    gcc g++ libpq-dev build-essential

PYTHON_VER=$(python3 --version 2>&1)
print_ok "Python: $PYTHON_VER"
print_ok "Libpq-dev dan build tools terinstall."

# ============================
# STEP 4: Cek file .env
# ============================
print_step "4" "Konfigurasi File .env"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warn "File .env dibuat dari .env.example."
        print_warn "PENTING: Edit file .env dan isi password & secret key!"
        print_warn "  nano .env"
        echo ""
        echo -e "${RED}  ❗ Script berhenti di sini.${NC}"
        echo -e "${RED}     Isi file .env terlebih dahulu, lalu jalankan lagi script ini.${NC}"
        echo ""
        echo "  Panduan isi .env:"
        echo "    POSTGRES_PASSWORD=<password_kuat_min_20_karakter>"
        echo "    REDIS_PASSWORD=<password_redis_aman>"
        echo "    SECRET_KEY=<hasil dari: python3 -c \"import secrets; print(secrets.token_hex(32))\">"
        echo "    DATABASE_URL=postgresql+asyncpg://tip_admin:<DB_PASS>@127.0.0.1:5432/iot_platform_tip"
        echo "    DATABASE_URL_SYNC=postgresql+psycopg2://tip_admin:<DB_PASS>@127.0.0.1:5432/iot_platform_tip"
        echo "    REDIS_URL=redis://:<REDIS_PASS>@127.0.0.1:6379/0"
        echo ""
        exit 0
    else
        print_error "File .env.example tidak ditemukan! Pastikan kamu berada di direktori project yang benar."
        exit 1
    fi
else
    # Validasi .env sudah diisi
    if grep -q "GANTI_PASSWORD_KUAT_DISINI" .env || grep -q "GANTI_REDIS_PASSWORD_DISINI" .env || grep -q "GANTI_DENGAN_RANDOM_HEX" .env; then
        print_error "File .env masih berisi nilai placeholder! Isi semua password dan secret key terlebih dahulu."
        echo "  Buka dengan: nano .env"
        exit 1
    fi
    print_ok "File .env ditemukan dan terisi."
fi

# ============================
# STEP 5: Setup Python Virtual Environment
# ============================
print_step "5" "Setup Python Virtual Environment"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    print_ok "Virtual environment '.venv' dibuat."
else
    print_ok "Virtual environment '.venv' sudah ada."
fi

# Aktifkan venv
source .venv/bin/activate
print_ok "Virtual environment diaktifkan."

# Upgrade pip
pip install --upgrade pip setuptools wheel -q
print_ok "pip, setuptools, wheel diperbarui."

# Install requirements
print_info "Menginstall semua dependensi Python (ini mungkin membutuhkan beberapa menit)..."
pip install -r requirements.txt -q
print_ok "Semua dependensi Python berhasil diinstall."

# ============================
# STEP 6: Jalankan Docker Compose
# ============================
print_step "6" "Menjalankan Container PostgreSQL + Redis"

# Cek apakah perlu newgrp
if ! docker ps &> /dev/null; then
    print_warn "Tidak bisa akses Docker tanpa sudo. Mencoba dengan sg docker..."
    DOCKER_CMD="sg docker -c"
else
    DOCKER_CMD=""
fi

if [ -n "$DOCKER_CMD" ]; then
    $DOCKER_CMD "docker compose up -d"
else
    docker compose up -d
fi

print_ok "Container berhasil dijalankan."
print_info "Menunggu container menjadi healthy (maks 90 detik)..."

# Tunggu container healthy
TIMEOUT=90
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    PG_STATUS=$(docker inspect --format='{{.State.Health.Status}}' tip_postgres 2>/dev/null || echo "starting")
    REDIS_STATUS=$(docker inspect --format='{{.State.Health.Status}}' tip_redis 2>/dev/null || echo "starting")

    if [ "$PG_STATUS" = "healthy" ] && [ "$REDIS_STATUS" = "healthy" ]; then
        print_ok "PostgreSQL: healthy ✅"
        print_ok "Redis: healthy ✅"
        break
    fi

    echo -ne "  ⏳ Menunggu... PostgreSQL: ${PG_STATUS}, Redis: ${REDIS_STATUS} (${ELAPSED}s/${TIMEOUT}s)\r"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ "$PG_STATUS" != "healthy" ] || [ "$REDIS_STATUS" != "healthy" ]; then
    print_warn "Container belum healthy setelah ${TIMEOUT}s. Cek log: docker compose logs db"
    print_info "Melanjutkan setup (mungkin butuh waktu lebih lama)..."
    sleep 15
fi

# ============================
# STEP 7: Jalankan Migrasi Alembic
# ============================
print_step "7" "Menjalankan Migrasi Database (Alembic)"

# Pastikan venv aktif
source .venv/bin/activate

print_info "Menjalankan: alembic upgrade head"
alembic upgrade head

print_ok "Semua migrasi berhasil dijalankan!"

# Verifikasi
CURRENT=$(alembic current 2>&1 | grep -v "^$")
print_info "Status migrasi saat ini: $CURRENT"

# ============================
# STEP 8: Summary & Instruksi Selanjutnya
# ============================
print_step "8" "Setup Selesai! 🎉"

# Dapatkan IP VM
VM_IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -1)

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           SETUP BERHASIL — IoT Platform TIP                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📦 Container    : ${GREEN}PostgreSQL (tip_postgres) + Redis (tip_redis) RUNNING${NC}"
echo -e "  🗄️  Database     : ${GREEN}Schema ter-migrasi (001, 002, 003)${NC}"
echo -e "  🐍 Python       : ${GREEN}Virtual environment .venv aktif + requirements installed${NC}"
echo ""
echo -e "${YELLOW}  🚀 LANGKAH SELANJUTNYA — Jalankan Web Server Demo:${NC}"
echo ""
echo -e "  ${CYAN}source .venv/bin/activate${NC}"
echo -e "  ${CYAN}uvicorn demo_app.main:app --host 0.0.0.0 --port 8000 --reload${NC}"
echo ""
echo -e "  Lalu buka di browser:"
echo -e "    Local  : ${GREEN}http://127.0.0.1:8000${NC}"
if [ -n "$VM_IP" ]; then
    echo -e "    Network: ${GREEN}http://${VM_IP}:8000${NC}  ← dari komputer Windows kamu"
fi
echo -e "    Docs   : ${GREEN}http://127.0.0.1:8000/docs${NC}  (Swagger API)"
echo ""
echo -e "  ${YELLOW}SEED DATA:${NC} Setelah server jalan, klik tombol '🌱 Seed Data Mock'"
echo "  di dashboard untuk mengisi database dengan data awal."
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
