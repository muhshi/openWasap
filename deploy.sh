#!/bin/bash
# =============================================================================
#  OpenWA - Deploy Script
#  Jalankan script ini di server untuk update ke versi terbaru dari GitHub.
#
#  Usage:
#    ./deploy.sh           → deploy normal
#    ./deploy.sh --force   → paksa rebuild semua layer (tanpa cache)
# =============================================================================

set -e  # Keluar otomatis jika ada error

# --- Warna output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
FORCE_BUILD=""

# Parse argumen
for arg in "$@"; do
  case $arg in
    --force)
      FORCE_BUILD="--no-cache"
      echo -e "${YELLOW}⚠️  Mode --force: build ulang semua layer tanpa cache${NC}"
      ;;
  esac
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🚀 OpenWA Deploy Script${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---- 1. Pastikan .env ada ----
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ File .env tidak ditemukan!${NC}"
  echo -e "   Salin dulu: ${YELLOW}cp .env.example .env${NC} lalu isi konfigurasi."
  exit 1
fi

# ---- 2. Git pull ----
echo -e "${BLUE}📥 [1/4] Mengambil perubahan terbaru dari Git...${NC}"
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
  echo -e "${GREEN}   ✅ Sudah up-to-date. Tidak ada perubahan baru.${NC}"
  echo ""
  read -p "   Tetap jalankan deploy ulang? (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo -e "${YELLOW}   ⏭️  Deploy dibatalkan.${NC}"
    exit 0
  fi
else
  COMMIT_COUNT=$(git rev-list --count HEAD..@{u})
  echo -e "${GREEN}   ✅ Ditemukan ${COMMIT_COUNT} commit baru. Pulling...${NC}"
  git pull origin "$(git branch --show-current)"
fi

echo ""

# ---- 3. Build image baru ----
echo -e "${BLUE}🔨 [2/4] Build Docker image (layer yang tidak berubah akan di-cache)...${NC}"
DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build $FORCE_BUILD
echo -e "${GREEN}   ✅ Build selesai.${NC}"
echo ""

# ---- 4. Restart container ----
echo -e "${BLUE}🔄 [3/4] Restart container dengan image terbaru...${NC}"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
echo -e "${GREEN}   ✅ Container berjalan.${NC}"
echo ""

# ---- 5. Cleanup image lama ----
echo -e "${BLUE}🧹 [4/4] Membersihkan image lama (dangling images)...${NC}"
docker image prune -f
echo -e "${GREEN}   ✅ Cleanup selesai.${NC}"
echo ""

# ---- Summary ----
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Deploy berhasil!${NC}"
echo ""

# Ambil port dari .env atau gunakan default
API_PORT=$(grep -E '^API_PORT=' .env | cut -d '=' -f2 | tr -d ' ' || echo "2785")
DASH_PORT=$(grep -E '^DASHBOARD_PORT=' .env | cut -d '=' -f2 | tr -d ' ' || echo "2886")

echo -e "  📊 Dashboard  : ${YELLOW}http://$(hostname -I | awk '{print $1}'):${DASH_PORT:-2886}${NC}"
echo -e "  📚 API Docs   : ${YELLOW}http://$(hostname -I | awk '{print $1}'):${API_PORT:-2785}/api/docs${NC}"
echo ""
echo -e "  Log backend   : ${CYAN}docker logs -f openwa-api${NC}"
echo -e "  Status semua  : ${CYAN}docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
