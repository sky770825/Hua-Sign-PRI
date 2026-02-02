#!/bin/bash

# 使用 Supabase CLI 直接執行 SQL
# 通過 psql 連接執行

set -e

echo "════════════════════════════════════════════════"
echo "  🚀 使用 Supabase CLI 執行 SQL"
echo "════════════════════════════════════════════════"
echo ""

PROJECT_REF="sqgrnowrcvspxhuudrqc"
SQL_STATEMENT="ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;"

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

# 使用 supabase db execute（如果支持）
echo "📝 執行 SQL..."
echo "════════════════════════════════════════════════"
echo "$SQL_STATEMENT"
echo "════════════════════════════════════════════════"
echo ""

# 嘗試使用 psql 通過 Supabase CLI
# 獲取資料庫連接資訊
echo "💡 由於 Supabase CLI 限制，建議使用以下方法："
echo ""
echo "【方法 1】在 Supabase Dashboard 中執行（最簡單）："
echo "  1. 前往: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
echo "  2. 貼上以下 SQL："
echo ""
echo "  $SQL_STATEMENT"
echo ""
echo "  3. 點擊 'Run' 執行"
echo ""
echo "【方法 2】使用 Supabase Management API（需要 access token）："
echo "  需要 Supabase access token 才能通過 API 執行 SQL"
echo ""

# 驗證環境變數
if [ -f .env.local ]; then
  echo "✅ .env.local 文件存在"
  if grep -q "SUPABASE_SERVICE_KEY" .env.local; then
    echo "✅ SUPABASE_SERVICE_KEY 已設置"
  fi
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  📋 下一步"
echo "════════════════════════════════════════════════"
echo ""
echo "1. 在 Supabase SQL Editor 中執行 SQL（見上方）"
echo "2. 重新啟動開發伺服器：npm run dev"
echo "3. 測試新增獎品功能"
echo ""
