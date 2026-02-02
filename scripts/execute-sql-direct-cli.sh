#!/bin/bash

# 使用 Supabase CLI 通過 psql 執行 SQL
# 獲取連接字符串並使用 psql

set -e

echo "════════════════════════════════════════════════"
echo "  🚀 使用 Supabase CLI + psql 執行 SQL"
echo "════════════════════════════════════════════════"
echo ""

PROJECT_REF="sqgrnowrcvspxhuudrqc"
SQL_FILE="${1:-fix_prizes_drop_policies.sql}"

# 檢查 Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI 未安裝"
  exit 1
fi

# 檢查 psql
if ! command -v psql &> /dev/null; then
  echo "❌ psql 未安裝"
  echo ""
  echo "請安裝 PostgreSQL："
  echo "  brew install postgresql"
  echo ""
  exit 1
fi

echo "✅ Supabase CLI 已安裝"
echo "✅ psql 已安裝"
echo ""

# 連結專案
echo "📋 連結專案..."
supabase link --project-ref "$PROJECT_REF" 2>&1 | grep -v "new version" || true
echo ""

# 檢查 SQL 文件
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL 文件不存在: $SQL_FILE"
  exit 1
fi

echo "✅ SQL 文件: $SQL_FILE"
echo ""

# 獲取資料庫連接資訊
echo "📋 獲取資料庫連接資訊..."
echo "💡 需要從 Supabase Dashboard 獲取連接字符串："
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo ""
echo "   或使用連接池連接字符串（推薦）："
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/database#connection-pooling"
echo ""

# 讀取環境變數
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# 嘗試構建連接字符串
if [ -n "$SUPABASE_DB_PASSWORD" ] && [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  # 從 URL 提取主機名
  DB_HOST=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
  DB_NAME="postgres"
  DB_USER="postgres"
  
  echo "📝 嘗試連接資料庫..."
  echo "   主機: $DB_HOST.supabase.co"
  echo "   資料庫: $DB_NAME"
  echo "   用戶: $DB_USER"
  echo ""
  
  # 構建連接字符串
  CONNECTION_STRING="postgresql://$DB_USER:$SUPABASE_DB_PASSWORD@$DB_HOST.supabase.co:5432/$DB_NAME"
  
  # 執行 SQL
  echo "🚀 執行 SQL..."
  if psql "$CONNECTION_STRING" -f "$SQL_FILE" 2>&1; then
    echo ""
    echo "✅ SQL 執行成功！"
    exit 0
  else
    echo ""
    echo "❌ SQL 執行失敗"
    echo ""
    echo "💡 可能的原因："
    echo "   1. 資料庫密碼不正確"
    echo "   2. 需要使用連接池連接字符串"
    echo "   3. 網路連接問題"
  fi
else
  echo "⚠️  缺少資料庫連接資訊"
  echo ""
  echo "請設置以下環境變數："
  echo "  SUPABASE_DB_PASSWORD=你的資料庫密碼"
  echo ""
  echo "或從 Supabase Dashboard 獲取連接字符串："
  echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
  echo ""
  echo "然後使用以下命令執行："
  echo "  psql '連接字符串' -f $SQL_FILE"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  💡 替代方法"
echo "════════════════════════════════════════════════"
echo ""
echo "如果無法使用 psql，建議在 Supabase Dashboard 中執行："
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
echo "SQL 內容："
cat "$SQL_FILE"
echo ""
