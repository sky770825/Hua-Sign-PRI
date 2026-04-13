#!/usr/bin/env bash
# 從 .env.local 讀取 Supabase 與後台密碼變數並同步到 Vercel
# 使用方式：./scripts/setup-vercel-env.sh [--project 專案名稱] [--output-only]
#   --project: 指定 Vercel 專案名稱，例：--project hua-sign-pri
#   --output-only: 僅輸出變數，供手動貼到 Vercel Dashboard
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"
OUTPUT_ONLY=false
PROJECT_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-only) OUTPUT_ONLY=true ;;
    --project)
      shift
      [[ -n "$1" ]] && PROJECT_ARG="-p $1"
      ;;
  esac
  shift
done

cd "$PROJECT_ROOT"

echo "=== Vercel 環境變數自動設定 ==="

# 檢查 Vercel CLI（僅在非 --output-only 時需要）
if [[ "$OUTPUT_ONLY" != "true" ]] && ! command -v vercel &>/dev/null; then
  echo "❌ 請先安裝 Vercel CLI: npm i -g vercel"
  exit 1
fi

# 檢查 .env.local
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ 找不到 .env.local"
  echo "請複製 .env.local.example 為 .env.local 並填入 Supabase 金鑰"
  exit 1
fi

# 連結專案（若尚未連結且非僅輸出模式）
if [[ "$OUTPUT_ONLY" != "true" ]]; then
  if [[ ! -d "$PROJECT_ROOT/.vercel" ]] || [[ ! -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
    echo "📌 連結 Vercel 專案..."
    rm -rf "$PROJECT_ROOT/.vercel" 2>/dev/null || true
    if [[ -n "$PROJECT_ARG" ]]; then
      vercel link --yes $PROJECT_ARG 2>/dev/null || vercel link $PROJECT_ARG
    else
      vercel link --yes 2>/dev/null || vercel link
    fi
  fi
fi

# 讀取變數（支援含 # 的註解與空行）
get_var() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' | tr -d '\r'
}

SUPABASE_URL=$(get_var "NEXT_PUBLIC_SUPABASE_URL")
ANON_KEY=$(get_var "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_KEY=$(get_var "SUPABASE_SERVICE_KEY")
SERVICE_ROLE=$(get_var "SUPABASE_SERVICE_ROLE_KEY")
ADMIN_PASSWORD=$(get_var "ADMIN_PASSWORD")

# 若沒有 SUPABASE_SERVICE_KEY 則嘗試 SUPABASE_SERVICE_ROLE_KEY
[[ -z "$SERVICE_KEY" && -n "$SERVICE_ROLE" ]] && SERVICE_KEY="$SERVICE_ROLE"

if [[ -z "$SUPABASE_URL" ]]; then
  echo "❌ .env.local 中找不到 NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi
if [[ -z "$ANON_KEY" ]]; then
  echo "❌ .env.local 中找不到 NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi
if [[ -z "$SERVICE_KEY" ]]; then
  echo "❌ .env.local 中找不到 SUPABASE_SERVICE_KEY 或 SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

if [[ "$OUTPUT_ONLY" == "true" ]]; then
  echo ""
  echo "📋 請將以下變數貼到 Vercel → Settings → Environment Variables："
  echo "   (或複製到 Bulk Edit)"
  echo ""
  echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
  echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY"
  if [[ -n "$ADMIN_PASSWORD" ]]; then
    echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
  else
    echo "# ADMIN_PASSWORD=（請在 .env.local 設定後再輸出，或直接在 Vercel 新增）"
  fi
  echo ""
  echo "✅ 輸出完成"
  exit 0
fi

add_env() {
  local name="$1"
  local value="$2"
  local sensitive="${3:-false}"
  local target="${4:-production}"
  echo "  設定 $name ($target) ..."
  local tmp
  tmp=$(mktemp)
  printf '%s' "$value" > "$tmp"
  if [[ "$sensitive" == "true" ]]; then
    vercel env add "$name" "$target" --force --yes --sensitive < "$tmp" 2>/dev/null || vercel env add "$name" "$target" --force --yes < "$tmp" 2>/dev/null || true
  else
    vercel env add "$name" "$target" --force --yes < "$tmp" 2>/dev/null || true
  fi
  rm -f "$tmp"
}

echo ""
echo "📤 同步環境變數到 Vercel (Production + Preview)..."
for target in production preview; do
  add_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL" "false" "$target"
  add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON_KEY" "true" "$target"
  add_env "SUPABASE_SERVICE_KEY" "$SERVICE_KEY" "true" "$target"
  if [[ -n "$ADMIN_PASSWORD" ]]; then
    add_env "ADMIN_PASSWORD" "$ADMIN_PASSWORD" "true" "$target"
  fi
done

echo ""
echo "✅ 環境變數已同步至 Vercel"
if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "⚠️  未在 .env.local 設定 ADMIN_PASSWORD，後台登入會顯示「未啟用」。請在 Vercel 新增該變數並 Redeploy，或寫入 .env.local 後再執行本腳本。"
fi
echo "💡 請在 Vercel Dashboard 執行 Redeploy，或執行：npm run deploy:vercel"
