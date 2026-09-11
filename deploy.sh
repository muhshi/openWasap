#!/bin/bash
# =============================================================================
#  OpenWA - Smart Deploy Script
#  Jalankan script ini di server untuk update ke versi terbaru dari GitHub.
#
#  Usage:
#    ./deploy.sh             → deploy cerdas (hanya build service yang berubah)
#    ./deploy.sh backend     → paksa build hanya backend (openwa)
#    ./deploy.sh dashboard   → paksa build hanya dashboard (openwa-dashboard)
#    ./deploy.sh --build     → paksa build semua service (dengan cache)
#    ./deploy.sh --force     → paksa rebuild semua layer (tanpa cache)
#    ./deploy.sh -y          → otomatis lanjutkan tanpa prompt konfirmasi
# =============================================================================

set -e  # Keluar otomatis jika ada error

# --- Warna output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.prod.yml"
STATE_FILE=".deploy_commit"
FORCE_BUILD=""
ALWAYS_BUILD=false
FORCE_BACKEND=false
FORCE_DASHBOARD=false
AUTO_YES=false

# Parse argumen
for arg in "$@"; do
  case $arg in
    --force)
      FORCE_BUILD="--no-cache"
      ALWAYS_BUILD=true
      echo -e "${YELLOW}⚠️  Mode --force: rebuild semua layer tanpa cache${NC}"
      ;;
    --build)
      ALWAYS_BUILD=true
      echo -e "${YELLOW}ℹ️  Mode --build: paksa build semua image${NC}"
      ;;
    backend|--backend)
      FORCE_BACKEND=true
      echo -e "${YELLOW}ℹ️  Mode: paksa build service Backend (openwa)${NC}"
      ;;
    dashboard|--dashboard)
      FORCE_DASHBOARD=true
      echo -e "${YELLOW}ℹ️  Mode: paksa build service Dashboard (openwa-dashboard)${NC}"
      ;;
    -y|--yes)
      AUTO_YES=true
      ;;
  esac
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🚀 OpenWA Smart Deploy Script${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---- 1. Pastikan .env ada ----
if [ ! -f ".env" ]; then
  echo -e "${RED}❌ File .env tidak ditemukan!${NC}"
  echo -e "   Salin dulu: ${YELLOW}cp .env.example .env${NC} lalu isi konfigurasi."
  exit 1
fi

# ---- 2. Cek status git & deteksi perubahan kode ----
echo -e "${BLUE}📥 [1/4] Mengambil status & update Git...${NC}"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
git fetch origin "$CURRENT_BRANCH" 2>/dev/null || git fetch origin

PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null)
UPSTREAM_COMMIT=$(git rev-parse "origin/$CURRENT_BRANCH" 2>/dev/null || git rev-parse '@{u}' 2>/dev/null || echo "$PREV_COMMIT")

# Ambil commit acuan deployment terakhir jika tersimpan
LAST_DEPLOYED_COMMIT=""
if [ -f "$STATE_FILE" ]; then
  SAVED_COMMIT=$(cat "$STATE_FILE" 2>/dev/null | tr -d '[:space:]')
  if git cat-file -e "${SAVED_COMMIT}^{commit}" 2>/dev/null; then
    LAST_DEPLOYED_COMMIT="$SAVED_COMMIT"
  fi
fi

# Jika ada commit baru di remote, lakukan pull
if [ "$PREV_COMMIT" != "$UPSTREAM_COMMIT" ]; then
  COMMIT_COUNT=$(git rev-list --count "$PREV_COMMIT..$UPSTREAM_COMMIT" 2>/dev/null || echo "beberapa")
  echo -e "${GREEN}   ✅ Ditemukan ${COMMIT_COUNT} commit baru di origin/${CURRENT_BRANCH}.${NC}"
  echo -e "   Menarik update terbaru..."
  git pull origin "$CURRENT_BRANCH"
  NEW_COMMIT=$(git rev-parse HEAD)
else
  echo -e "${GREEN}   ✅ Repository lokal sudah sama dengan remote origin/${CURRENT_BRANCH}.${NC}"
  NEW_COMMIT="$PREV_COMMIT"
fi

# Tentukan titik pembanding untuk git diff
# Prioritas pembanding: commit saat terakhir kali deploy berhasil
COMPARE_BASE=""
if [ -n "$LAST_DEPLOYED_COMMIT" ]; then
  COMPARE_BASE="$LAST_DEPLOYED_COMMIT"
elif [ "$PREV_COMMIT" != "$NEW_COMMIT" ]; then
  COMPARE_BASE="$PREV_COMMIT"
else
  # Jika pertama kali dan repo sudah up-to-date, cek 1 commit sebelumnya sebagai sampel
  COMPARE_BASE=$(git rev-parse HEAD~1 2>/dev/null || echo "$NEW_COMMIT")
fi

BUILD_BACKEND=false
BUILD_DASHBOARD=false

# Cek file yang berubah sejak deploy terakhir
if [ "$COMPARE_BASE" != "$NEW_COMMIT" ]; then
  CHANGED_FILES=$(git diff --name-only "$COMPARE_BASE" "$NEW_COMMIT" 2>/dev/null || true)
  
  if [ -n "$CHANGED_FILES" ]; then
    echo -e "${CYAN}   📋 Perubahan terdeteksi sejak deploy terakhir (${COMPARE_BASE:0:7}..${NEW_COMMIT:0:7}):${NC}"
    
    # Deteksi backend
    if echo "$CHANGED_FILES" | grep -qE '^(src/|package.*|tsconfig.*|nest-cli\.json|Dockerfile|\.dockerignore)'; then
      BUILD_BACKEND=true
      echo -e "      • [Backend] Source code / dependencies berubah"
    fi
    
    # Deteksi dashboard
    if echo "$CHANGED_FILES" | grep -qE '^dashboard/'; then
      BUILD_DASHBOARD=true
      echo -e "      • [Dashboard] Frontend source code / config berubah"
    fi

    # Tampilkan jika hanya file non-code yang berubah
    if [ "$BUILD_BACKEND" = false ] && [ "$BUILD_DASHBOARD" = false ]; then
      echo -e "      • (Hanya dokumentasi/scripts/environment yang berubah)"
    fi
  fi
fi

# Cek apakah image Docker lokal sudah ada di host
# Backend image check
if ! docker image inspect openwa-api:latest >/dev/null 2>&1 && \
   ! docker image inspect openwa-openwa:latest >/dev/null 2>&1 && \
   ! docker image inspect openwa_openwa:latest >/dev/null 2>&1; then
  echo -e "${YELLOW}   ⚠️  Image Docker backend belum ditemukan di host, build diperlukan.${NC}"
  BUILD_BACKEND=true
fi

# Dashboard image check
if ! docker image inspect openwa-dashboard:latest >/dev/null 2>&1 && \
   ! docker image inspect openwa-openwa-dashboard:latest >/dev/null 2>&1 && \
   ! docker image inspect openwa_openwa-dashboard:latest >/dev/null 2>&1; then
  echo -e "${YELLOW}   ⚠️  Image Docker dashboard belum ditemukan di host, build diperlukan.${NC}"
  BUILD_DASHBOARD=true
fi

# Override jika ada argumen CLI spesifik
if [ "$ALWAYS_BUILD" = true ]; then
  BUILD_BACKEND=true
  BUILD_DASHBOARD=true
fi
if [ "$FORCE_BACKEND" = true ]; then
  BUILD_BACKEND=true
fi
if [ "$FORCE_DASHBOARD" = true ]; then
  BUILD_DASHBOARD=true
fi

echo ""

# ---- 3. Build image jika diperlukan ----
echo -e "${BLUE}🔨 [2/4] Menjalankan build Docker image...${NC}"

DID_BUILD=false

if [ "$BUILD_BACKEND" = true ] && [ "$BUILD_DASHBOARD" = true ]; then
  echo -e "${YELLOW}   ⚡ Membuild kedua service (Backend & Dashboard)...${NC}"
  DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build $FORCE_BUILD
  DID_BUILD=true
  echo -e "${GREEN}   ✅ Build kedua service selesai.${NC}"
elif [ "$BUILD_BACKEND" = true ]; then
  echo -e "${YELLOW}   ⚡ Hanya Backend yang perlu build. Membuild service openwa...${NC}"
  DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build $FORCE_BUILD openwa
  DID_BUILD=true
  echo -e "${GREEN}   ✅ Build Backend selesai (Dashboard dilewati).${NC}"
elif [ "$BUILD_DASHBOARD" = true ]; then
  echo -e "${YELLOW}   ⚡ Hanya Dashboard yang perlu build. Membuild service openwa-dashboard...${NC}"
  DOCKER_BUILDKIT=1 docker compose -f "$COMPOSE_FILE" build $FORCE_BUILD openwa-dashboard
  DID_BUILD=true
  echo -e "${GREEN}   ✅ Build Dashboard selesai (Backend dilewati).${NC}"
else
  echo -e "${GREEN}   ⏭️  Tidak ada perubahan kode yang memerlukan build.${NC}"
  echo -e "      (Menggunakan image yang sudah ada, menghemat waktu build).${NC}"
fi

echo ""

# ---- 4. Jalankan / update container ----
echo -e "${BLUE}🔄 [3/4] Menjalankan container dengan docker compose...${NC}"
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
echo -e "${GREEN}   ✅ Container berhasil diterapkan & berjalan.${NC}"
echo ""

# Simpan state commit deploy yang berhasil
echo "$NEW_COMMIT" > "$STATE_FILE"

# ---- 5. Cleanup image lama jika ada build ----
if [ "$DID_BUILD" = true ] || [ -n "$FORCE_BUILD" ]; then
  echo -e "${BLUE}🧹 [4/4] Membersihkan dangling images lama...${NC}"
  docker image prune -f >/dev/null 2>&1 || true
  echo -e "${GREEN}   ✅ Cleanup selesai.${NC}"
else
  echo -e "${BLUE}🧹 [4/4] Tidak ada image baru yang dibuild, lewati cleanup.${NC}"
fi

echo ""

# ---- Summary ----
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉 Deploy berhasil! (Commit: ${NEW_COMMIT:0:7})${NC}"
echo ""

API_PORT=$(grep -E '^API_PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ' || echo "2785")
DASH_PORT=$(grep -E '^DASHBOARD_PORT=' .env 2>/dev/null | cut -d '=' -f2 | tr -d ' ' || echo "2886")
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo -e "  📊 Dashboard  : ${YELLOW}http://${SERVER_IP}:${DASH_PORT:-2886}${NC}"
echo -e "  📚 API Docs   : ${YELLOW}http://${SERVER_IP}:${API_PORT:-2785}/api/docs${NC}"
echo ""
echo -e "  Log backend   : ${CYAN}docker logs -f openwa-api${NC}"
echo -e "  Status semua  : ${CYAN}docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
