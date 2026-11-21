#!/bin/bash
# =============================================================================
#  OpenWA - Quick Pairing & Session Status Tool
#  Usage:
#    ./scripts/pair-session.sh [session_name]
#    Default session_name: wa-dspot-pst
# =============================================================================

SESSION_NAME="${1:-wa-dspot-pst}"
API_URL="${OPENWA_API_URL:-http://localhost:2786}"
API_KEY="${OPENWA_API_KEY:-Muhshi3321}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 OpenWA Session Pairing Tool: ${SESSION_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Cek status sesi
echo "🔍 Memeriksa status sesi ${SESSION_NAME}..."
STATUS_RES=$(curl -s -H "X-API-Key: ${API_KEY}" "${API_URL}/api/sessions/${SESSION_NAME}/status" 2>/dev/null || true)

if [ -z "$STATUS_RES" ]; then
  # Fallback coba port internal 2785 jika dijalankan di host/container
  API_URL="http://localhost:2785"
  STATUS_RES=$(curl -s -H "X-API-Key: ${API_KEY}" "${API_URL}/api/sessions/${SESSION_NAME}/status" 2>/dev/null || true)
fi

echo "Status response: ${STATUS_RES}"

# 2. Cek apakah sudah connected
if echo "${STATUS_RES}" | grep -q '"connected":true'; then
  echo ""
  echo "✅ Sesi ${SESSION_NAME} SUDAH TERHUBUNG (CONNECTED)!"
  exit 0
fi

# 3. Jika belum connected atau belum running, trigger start
echo "⚡ Menginisialisasi sesi ${SESSION_NAME}..."
curl -s -X POST -H "X-API-Key: ${API_KEY}" "${API_URL}/api/sessions/${SESSION_NAME}/start" >/dev/null 2>&1 || true

echo "⏳ Menunggu QR code di-generate..."
sleep 4

# 4. Tampilkan QR Code ASCII dari log container
if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "📲 SCAN QR CODE BERIKUT DENGAN WHATSAPP ANDA:"
  echo ""
  docker logs openwa-api --tail 45 2>&1 | grep -A 30 "SCAN QR CODE: ${SESSION_NAME}" | tail -n 30 || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 Atau buka Dashboard Web: http://10.133.21.24:2886"
echo "  👉 Masuk menu Sessions -> Klik tombol QR pada '${SESSION_NAME}'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
