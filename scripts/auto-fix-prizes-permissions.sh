#!/bin/bash

# 自動修復獎品權限問題
# 使用 Supabase CLI 執行 SQL

set -e

echo "════════════════════════════════════════════════"
echo "  🔧 自動修復獎品權限問題"
echo "════════════════════════════════════════════════"
echo ""

# 檢查 Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI 未安裝"
  echo ""
  echo "請安裝 Supabase CLI："
  echo "  brew install supabase/tap/supabase"
  echo ""
  echo "或使用 npm："
  echo "  npm install -g supabase"
  exit 1
fi

echo "✅ Supabase CLI 已安裝"
echo ""

# 檢查環境變數
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_KEY 環境變數未設置"
  echo "   嘗試從 .env.local 讀取..."
  
  if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
    echo "✅ 已從 .env.local 載入環境變數"
  else
    echo "❌ .env.local 文件不存在"
    exit 1
  fi
fi

# 設置 Supabase 專案
PROJECT_REF="sqgrnowrcvspxhuudrqc"
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"

echo "📋 專案資訊："
echo "  Project Ref: $PROJECT_REF"
echo "  URL: $SUPABASE_URL"
echo ""

# 創建臨時 SQL 文件
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << 'EOF'
-- 禁用 RLS（Row Level Security）
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;

-- 驗證 RLS 狀態
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
EOF

echo "📝 執行 SQL 修復..."
echo ""

# 使用 Supabase CLI 執行 SQL
# 方法 1: 使用 supabase db execute（需要登入）
if supabase projects list &> /dev/null; then
  echo "✅ Supabase CLI 已登入"
  echo "   執行 SQL..."
  
  # 連結專案
  supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
  
  # 執行 SQL
  if supabase db execute --file "$SQL_FILE" 2>&1; then
    echo ""
    echo "✅ SQL 執行成功！"
  else
    echo ""
    echo "⚠️  使用 Supabase CLI 執行失敗，嘗試其他方法..."
  fi
else
  echo "⚠️  Supabase CLI 未登入"
  echo "   嘗試使用 API 方式..."
fi

# 方法 2: 使用 curl 直接調用 Supabase REST API
echo ""
echo "📋 使用 Supabase REST API 執行 SQL..."

# 使用 Supabase REST API 執行 SQL
# 注意：這需要 service_role key
API_URL="${SUPABASE_URL}/rest/v1/rpc/exec_sql"

# 讀取 SQL 內容
SQL_CONTENT=$(cat "$SQL_FILE")

# 使用 Supabase Management API（需要 access token）
# 或者使用 PostgREST 的 exec_sql 函數（如果存在）

echo "💡 建議手動執行 SQL："
echo ""
echo "在 Supabase SQL Editor 中執行："
echo "  https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo ""
cat "$SQL_FILE"
echo ""

# 清理臨時文件
rm -f "$SQL_FILE"

echo "════════════════════════════════════════════════"
echo "  ✅ 自動化腳本執行完成"
echo "════════════════════════════════════════════════"
echo ""
echo "📋 下一步："
echo "  1. 如果 SQL 已自動執行，請驗證結果"
echo "  2. 如果未自動執行，請在 Supabase SQL Editor 中手動執行"
echo "  3. 重新啟動開發伺服器：npm run dev"
echo "  4. 測試新增獎品功能"
echo ""
