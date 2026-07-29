#!/bin/bash
# =============================================================================
# IoT Platform TIP — Quick Management Script
# Perintah-perintah cepat untuk mengelola platform sehari-hari
#
# Usage:
#   ./manage.sh [command]
#
# Commands:
#   start       — Jalankan semua service
#   stop        — Hentikan semua service
#   restart     — Restart semua service
#   status      — Lihat status container & systemd
#   logs [svc]  — Lihat log container (default: semua)
#   monitor     — Monitor resource CPU/RAM real-time
#   health      — Cek health semua endpoint
#   seed        — Seed data mock ke database
#   migrate     — Jalankan migrasi Alembic
#   reset       — Hapus data & mulai ulang (⚠️ HAPUS DATA!)
#   update      — Pull update dari GitHub & rebuild
#   backup      — Backup database PostgreSQL
# =============================================================================

set -euo pipefail

# ─── WARNA ────────────────────────────────────────────────────────────────────
RED='\033[0;31m';  GREEN='\033[0;32m';  YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m';   BOLD='\033[1m';  NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
info() { echo -e "${CYAN}  ℹ️  $1${NC}"; }
err()  { echo -e "${RED}  ❌ $1${NC}"; exit 1; }
hdr()  { echo -e "\n${BLUE}${BOLD}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

COMMAND="${1:-help}"

# =============================================================================
case "$COMMAND" in

# ─── START ────────────────────────────────────────────────────────────────────
start)
    hdr "▶️  Starting IoT Platform TIP"
    docker compose up -d
    ok "Semua service berhasil distart."
    echo ""
    docker compose ps
    ;;

# ─── STOP ─────────────────────────────────────────────────────────────────────
stop)
    hdr "⏹️  Stopping IoT Platform TIP"
    warn "Menghentikan semua container..."
    docker compose stop
    ok "Semua container dihentikan."
    ;;

# ─── RESTART ──────────────────────────────────────────────────────────────────
restart)
    hdr "🔄 Restarting IoT Platform TIP"
    docker compose restart
    ok "Semua container telah di-restart."
    echo ""
    docker compose ps
    ;;

# ─── STATUS ───────────────────────────────────────────────────────────────────
status)
    hdr "📊 Status IoT Platform TIP"

    echo -e "\n${BOLD}[ Docker Containers ]${NC}"
    docker compose ps

    echo -e "\n${BOLD}[ Systemd Services ]${NC}"
    systemctl is-active --quiet iot-platform-tip.service && \
        echo -e "  iot-platform-tip     : ${GREEN}active ✅${NC}" || \
        echo -e "  iot-platform-tip     : ${RED}inactive ❌${NC}"

    systemctl is-active --quiet iot-platform-tip-watchdog.service && \
        echo -e "  tip-watchdog         : ${GREEN}active ✅${NC}" || \
        echo -e "  tip-watchdog         : ${YELLOW}inactive ⚠️${NC}"

    echo -e "\n${BOLD}[ Port Listening ]${NC}"
    for port in 5173 8000 3000 1884 8001; do
        if nc -z localhost "$port" 2>/dev/null; then
            echo -e "  Port ${port}  : ${GREEN}OPEN ✅${NC}"
        else
            echo -e "  Port ${port}  : ${RED}CLOSED ❌${NC}"
        fi
    done

    echo -e "\n${BOLD}[ Watchdog Log (10 baris terakhir) ]${NC}"
    if [ -f /var/log/tip-watchdog.log ]; then
        tail -10 /var/log/tip-watchdog.log
    else
        warn "Log watchdog belum ada."
    fi
    ;;

# ─── LOGS ─────────────────────────────────────────────────────────────────────
logs)
    SERVICE="${2:-}"
    hdr "📋 Logs: ${SERVICE:-Semua Services}"
    if [ -n "$SERVICE" ]; then
        docker compose logs -f --tail=100 "$SERVICE"
    else
        echo "Services tersedia: backend | iot-gateway | frontend | db | redis | ai-serving"
        echo "Gunakan: ./manage.sh logs [service-name]"
        echo ""
        docker compose logs --tail=50
    fi
    ;;

# ─── MONITOR ──────────────────────────────────────────────────────────────────
monitor)
    hdr "📈 Resource Monitor (Ctrl+C untuk keluar)"
    docker stats tip_postgres tip_redis tip_backend tip_iot_gateway tip_frontend tip_ai_serving
    ;;

# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
health)
    hdr "🏥 Health Check Semua Endpoint"

    check_endpoint() {
        local name="$1" url="$2"
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "ERR")
        if [[ "$HTTP" =~ ^2 ]]; then
            echo -e "  ${name,-30} ${GREEN}OK (HTTP $HTTP) ✅${NC}  → $url"
        else
            echo -e "  ${name,-30} ${RED}FAIL (HTTP $HTTP) ❌${NC}  → $url"
        fi
    }

    echo ""
    check_endpoint "Backend API Status"        "http://localhost:8000/api/status"
    check_endpoint "Backend Swagger Docs"      "http://localhost:8000/docs"
    check_endpoint "IoT Gateway HTTP Health"   "http://localhost:3000/health"
    check_endpoint "Frontend Dashboard"        "http://localhost:5173"
    check_endpoint "AI Serving"               "http://localhost:8001"
    check_endpoint "Gateway Logs API"          "http://localhost:8000/api/v1/gateway/logs"
    check_endpoint "Gateway Stats API"         "http://localhost:8000/api/v1/gateway/stats"

    echo ""
    echo -e "${BOLD}[ Database & Redis ]${NC}"
    PG_H=$(docker inspect --format='{{.State.Health.Status}}' tip_postgres 2>/dev/null || echo "n/a")
    RD_H=$(docker inspect --format='{{.State.Health.Status}}' tip_redis    2>/dev/null || echo "n/a")
    GW_H=$(docker inspect --format='{{.State.Health.Status}}' tip_iot_gateway 2>/dev/null || echo "n/a")
    echo -e "  PostgreSQL Health              : $([[ $PG_H == healthy ]] && echo "${GREEN}healthy ✅${NC}" || echo "${RED}$PG_H ❌${NC}")"
    echo -e "  Redis Health                   : $([[ $RD_H == healthy ]] && echo "${GREEN}healthy ✅${NC}" || echo "${RED}$RD_H ❌${NC}")"
    echo -e "  IoT Gateway Health             : $([[ $GW_H == healthy ]] && echo "${GREEN}healthy ✅${NC}" || echo "${YELLOW}$GW_H ⚠️${NC}")"
    ;;

# ─── SEED DATA ────────────────────────────────────────────────────────────────
seed)
    hdr "🌱 Seed Data Mock ke Database"
    RESULT=$(curl -s -X POST http://localhost:8000/api/seed-mock 2>/dev/null)
    echo "  Response: $RESULT"
    if echo "$RESULT" | grep -q "success"; then
        ok "Data mock berhasil di-seed!"
        info "Akun: pak-ahmad@example.com / password_tes_123"
        info "API Key Device 1: key_greenhouse_123"
        info "API Key Device 2: key_smarthome_456"
    else
        warn "Seed gagal atau data sudah ada."
    fi
    ;;

# ─── MIGRATE ──────────────────────────────────────────────────────────────────
migrate)
    hdr "🗄️  Migrasi Database (Alembic)"
    docker compose exec -T backend alembic upgrade head
    ok "Migrasi selesai."
    docker compose exec -T backend alembic current
    ;;

# ─── BACKUP DATABASE ──────────────────────────────────────────────────────────
backup)
    hdr "💾 Backup Database PostgreSQL"
    BACKUP_DIR="${PROJECT_DIR}/backups"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/iot_platform_tip_${TIMESTAMP}.sql.gz"

    info "Membuat backup ke: $BACKUP_FILE"
    docker compose exec -T db pg_dump \
        -U "${POSTGRES_USER:-tip_admin}" \
        "${POSTGRES_DB:-iot_platform_tip}" | gzip > "$BACKUP_FILE"

    BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    ok "Backup berhasil! File: $BACKUP_FILE ($BACKUP_SIZE)"

    # Hapus backup lama (simpan 7 terakhir)
    ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
    info "Backup lama dibersihkan (simpan 7 terbaru)."
    ;;

# ─── UPDATE ───────────────────────────────────────────────────────────────────
update)
    hdr "🔄 Update Platform dari GitHub"
    warn "Ini akan pull perubahan terbaru dan rebuild container."
    read -rp "  Lanjutkan? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        info "Dibatalkan."; exit 0
    fi

    info "Pulling latest code..."
    git pull origin main

    info "Rebuild container yang berubah..."
    docker compose build --parallel

    info "Restart semua service..."
    docker compose up -d

    info "Jalankan migrasi jika ada perubahan schema..."
    docker compose exec -T backend alembic upgrade head 2>/dev/null || true

    ok "Update selesai!"
    docker compose ps
    ;;

# ─── RESET (DANGER!) ──────────────────────────────────────────────────────────
reset)
    hdr "⚠️  RESET PLATFORM (HAPUS SEMUA DATA!)"
    echo -e "${RED}${BOLD}  PERINGATAN: Ini akan menghapus SEMUA data database dan volume!${NC}"
    echo -e "${RED}  Tidak bisa di-undo!${NC}"
    echo ""
    read -rp "  Ketik 'HAPUS SEMUA DATA' untuk konfirmasi: " CONFIRM
    if [ "$CONFIRM" != "HAPUS SEMUA DATA" ]; then
        info "Reset dibatalkan."; exit 0
    fi

    warn "Menghentikan semua container..."
    docker compose down -v --remove-orphans

    warn "Menghapus volume data..."
    docker volume rm tip_postgres_data tip_redis_data 2>/dev/null || true

    warn "Rebuild dari awal..."
    docker compose build --no-cache
    docker compose up -d

    info "Tunggu database siap..."
    sleep 30

    info "Jalankan migrasi..."
    docker compose exec -T backend alembic upgrade head 2>/dev/null || true

    info "Seed data awal..."
    sleep 10
    curl -s -X POST http://localhost:8000/api/seed-mock >/dev/null 2>&1 || true

    ok "Platform berhasil di-reset dan diinisialisasi ulang."
    docker compose ps
    ;;

# ─── TEST GATEWAY ─────────────────────────────────────────────────────────────
test-gateway)
    hdr "🧪 Test Kirim Data ke IoT Gateway"

    API_KEY="${2:-key_greenhouse_123}"
    TEMP="${3:-28.5}"
    HUMIDITY="${4:-65.0}"

    info "Mengirim data ke HTTP Gateway..."
    RESULT=$(curl -s -X POST http://localhost:3000/api/v1/telemetry \
        -H "Content-Type: application/json" \
        -H "x-api-key: ${API_KEY}" \
        -d "{\"device_id\":\"sensor-test-01\",\"temperature\":${TEMP},\"humidity\":${HUMIDITY}}")
    echo "  Response: $RESULT"
    if echo "$RESULT" | grep -q '"status":"success"'; then
        ok "Data berhasil diterima gateway!"
    else
        warn "Response tidak 'success'. Cek apakah data sudah di-seed."
    fi
    ;;

# ─── HELP ─────────────────────────────────────────────────────────────────────
help|*)
    echo ""
    echo -e "${BOLD}IoT Platform TIP — Management Script${NC}"
    echo -e "${CYAN}Usage: ./manage.sh [command] [options]${NC}"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${GREEN}start${NC}               Jalankan semua service"
    echo -e "  ${GREEN}stop${NC}                Hentikan semua service"
    echo -e "  ${GREEN}restart${NC}             Restart semua service"
    echo -e "  ${GREEN}status${NC}              Status container, port, dan systemd"
    echo -e "  ${GREEN}logs [service]${NC}      Lihat log real-time (opsional: nama service)"
    echo -e "  ${GREEN}monitor${NC}             Monitor CPU/RAM real-time"
    echo -e "  ${GREEN}health${NC}              Health check semua endpoint"
    echo -e "  ${GREEN}seed${NC}                Seed data mock ke database"
    echo -e "  ${GREEN}migrate${NC}             Jalankan migrasi Alembic"
    echo -e "  ${GREEN}backup${NC}              Backup database PostgreSQL"
    echo -e "  ${GREEN}update${NC}              Pull update GitHub & rebuild"
    echo -e "  ${GREEN}test-gateway${NC}        Test kirim data ke gateway HTTP"
    echo -e "  ${RED}reset${NC}               ⚠️  HAPUS SEMUA DATA & reset ulang"
    echo ""
    echo -e "${BOLD}Contoh:${NC}"
    echo -e "  ./manage.sh start"
    echo -e "  ./manage.sh logs iot-gateway"
    echo -e "  ./manage.sh test-gateway key_greenhouse_123 38.5 65"
    echo -e "  ./manage.sh backup"
    echo ""
    ;;

esac
