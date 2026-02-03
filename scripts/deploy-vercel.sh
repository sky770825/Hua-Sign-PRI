#!/usr/bin/env bash
# Vercel 一鍵部署：連結、同步環境變數、部署
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== Vercel 一鍵部署 ==="

# 1. 同步環境變數（若 .env.local 存在）
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  bash "$SCRIPT_DIR/setup-vercel-env.sh"
else
  echo "⚠️ 無 .env.local，跳過環境變數同步"
  echo "  若要設定，請執行：npm run setup:vercel"
  if [[ ! -d "$PROJECT_ROOT/.vercel" ]] || [[ ! -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
    echo "📌 連結 Vercel 專案..."
    vercel link --yes 2>/dev/null || vercel link
  fi
fi

# 2. 部署
echo ""
echo "🚀 部署中..."
vercel --prod

echo ""
echo "✅ 部署完成"
