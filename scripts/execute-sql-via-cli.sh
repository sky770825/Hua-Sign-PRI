#!/bin/bash

# 使用 Supabase CLI 直接執行 SQL
# 通過獲取資料庫連接資訊並使用 psql

set -e

echo "════════════════════════════════════════════════"
echo "  🚀 使用 Supabase CLI 執行 SQL"
echo "════════════════════════════════════════════════"
echo ""

PROJECT_REF="sqgrnowrcvspxhuudrqc"
SQL_FILE="${1:-fix_prizes_drop_policies.sql}"

# 檢查 Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI 未安裝"
  exit 1
fi

echo "✅ Supabase CLI 已安裝"
echo ""

# 檢查是否已登入
if ! supabase projects list &> /dev/null; then
  echo "❌ Supabase CLI 未登入"
  echo "   請執行: supabase login"
  exit 1
fi

echo "✅ Supabase CLI 已登入"
echo ""

# 連結專案
echo "📋 連結專案..."
supabase link --project-ref "$PROJECT_REF" 2>&1 | grep -v "new version" || true
echo "✅ 專案已連結"
echo ""

# 檢查 SQL 文件
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL 文件不存在: $SQL_FILE"
  exit 1
fi

echo "✅ SQL 文件: $SQL_FILE"
echo ""

# 方法 1: 嘗試使用 supabase db remote exec（如果存在）
echo "📝 方法 1: 嘗試使用 supabase db remote exec..."
if supabase db remote exec --file "$SQL_FILE" 2>&1; then
  echo "✅ SQL 執行成功！"
  exit 0
else
  echo "⚠️  方法 1 不可用，嘗試其他方法..."
fi

echo ""

# 方法 2: 使用 supabase db push（需要遷移文件）
echo "📝 方法 2: 檢查是否可以使用 db push..."
echo "⚠️  db push 需要遷移文件格式，不適合執行任意 SQL"
echo ""

# 方法 3: 獲取連接字符串並使用 psql
echo "📝 方法 3: 獲取資料庫連接資訊..."
if command -v psql &> /dev/null; then
  echo "✅ psql 已安裝"
  
  # 嘗試獲取連接字符串
  # 注意：Supabase CLI 可能不直接提供連接字符串
  # 需要從 Supabase Dashboard 獲取或使用環境變數
  
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
  fi
  
  # 從環境變數構建連接字符串
  if [ -n "$SUPABASE_SERVICE_KEY" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "💡 可以使用 psql 連接，但需要資料庫密碼"
    echo "   請從 Supabase Dashboard 獲取連接字符串："
    echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
    echo ""
  fi
else
  echo "⚠️  psql 未安裝"
  echo "   可以安裝：brew install postgresql"
fi

echo ""

# 方法 4: 使用 Supabase Management API
echo "📝 方法 4: 使用 Supabase Management API..."
echo "💡 需要 Supabase Access Token"
echo "   可以通過 supabase projects list 查看已登入的 token"
echo ""

# 最終建議
echo "════════════════════════════════════════════════"
echo "  💡 建議方法"
echo "════════════════════════════════════════════════"
echo ""
echo "由於 Supabase CLI 的限制，建議使用以下方法："
echo ""
echo "【方法 1】在 Supabase Dashboard 中執行（最簡單）："
echo "  1. 前往: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "  2. 貼上 SQL 內容："
echo ""
cat "$SQL_FILE"
echo ""
echo "  3. 點擊 'Run' 執行"
echo ""
echo "【方法 2】使用 psql（如果已安裝且有連接字符串）："
echo "  1. 從 Supabase Dashboard 獲取連接字符串"
echo "  2. 執行: psql '連接字符串' -f $SQL_FILE"
echo ""
