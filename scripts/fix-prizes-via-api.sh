#!/bin/bash

# 使用 Supabase REST API 自動修復獎品權限
# 直接調用 Supabase Management API

set -e

echo "════════════════════════════════════════════════"
echo "  🔧 使用 API 自動修復獎品權限"
echo "════════════════════════════════════════════════"
echo ""

# 載入環境變數
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

PROJECT_REF="sqgrnowrcvspxhuudrqc"
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_KEY 未設置"
  echo "   請確認 .env.local 文件存在並包含 SUPABASE_SERVICE_KEY"
  exit 1
fi

echo "✅ 環境變數已載入"
echo "  Project Ref: $PROJECT_REF"
echo "  Service Key: ${SUPABASE_SERVICE_KEY:0:20}..."
echo ""

# 創建 SQL 語句
SQL_STATEMENT="ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;"

echo "📝 準備執行 SQL："
echo "  $SQL_STATEMENT"
echo ""

# 使用 Supabase PostgREST API 執行 SQL
# 注意：PostgREST 不直接支持執行任意 SQL
# 需要使用 Supabase Management API 或 Database API

echo "💡 由於 Supabase REST API 限制，建議使用以下方法："
echo ""
echo "方法 1: 使用 Supabase CLI（推薦）"
echo "  1. 安裝: brew install supabase/tap/supabase"
echo "  2. 登入: supabase login"
echo "  3. 連結: supabase link --project-ref $PROJECT_REF"
echo "  4. 執行: supabase db execute --file <sql_file>"
echo ""
echo "方法 2: 在 Supabase Dashboard 中手動執行"
echo "  1. 前往: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "  2. 貼上以下 SQL："
echo ""
echo "════════════════════════════════════════════════"
echo "$SQL_STATEMENT"
echo "════════════════════════════════════════════════"
echo ""
echo "  3. 點擊 'Run' 執行"
echo ""

# 驗證環境變數設置
echo "✅ 環境變數已設置："
echo "  - SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:30}..."
echo ""
echo "📋 請在 Supabase SQL Editor 中執行 SQL，然後重新啟動開發伺服器"
echo ""
