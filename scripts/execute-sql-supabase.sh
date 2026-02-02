#!/bin/bash

# 使用 Supabase CLI 執行 SQL 修復
# 自動化執行 fix_prizes_permissions.sql

set -e

echo "════════════════════════════════════════════════"
echo "  🚀 Supabase CLI 自動化執行 SQL"
echo "════════════════════════════════════════════════"
echo ""

PROJECT_REF="sqgrnowrcvspxhuudrqc"
SQL_FILE="fix_prizes_permissions.sql"

# 檢查 Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI 未安裝"
  echo ""
  echo "安裝 Supabase CLI："
  echo "  brew install supabase/tap/supabase"
  echo ""
  echo "或："
  echo "  npm install -g supabase"
  echo ""
  exit 1
fi

echo "✅ Supabase CLI 已安裝"
echo ""

# 檢查 SQL 文件
if [ ! -f "$SQL_FILE" ]; then
  echo "❌ SQL 文件不存在: $SQL_FILE"
  exit 1
fi

echo "✅ SQL 文件存在: $SQL_FILE"
echo ""

# 檢查是否已登入
echo "📋 檢查 Supabase CLI 登入狀態..."
if supabase projects list &> /dev/null; then
  echo "✅ Supabase CLI 已登入"
else
  echo "⚠️  Supabase CLI 未登入"
  echo ""
  echo "請先登入："
  echo "  supabase login"
  echo ""
  exit 1
fi

# 連結專案
echo "📋 連結 Supabase 專案..."
if supabase link --project-ref "$PROJECT_REF" 2>&1; then
  echo "✅ 專案連結成功"
else
  echo "⚠️  專案可能已連結，繼續執行..."
fi

echo ""

# 執行 SQL
echo "📝 執行 SQL 修復..."
echo "════════════════════════════════════════════════"
if supabase db execute --file "$SQL_FILE" 2>&1; then
  echo "════════════════════════════════════════════════"
  echo ""
  echo "✅ SQL 執行成功！"
else
  echo "════════════════════════════════════════════════"
  echo ""
  echo "❌ SQL 執行失敗"
  echo ""
  echo "💡 替代方案："
  echo "  在 Supabase SQL Editor 中手動執行："
  echo "  https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"
  echo ""
  echo "  然後貼上以下 SQL："
  echo ""
  cat "$SQL_FILE" | head -5
  echo "  ..."
  echo ""
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  ✅ 自動化執行完成"
echo "════════════════════════════════════════════════"
echo ""
echo "📋 下一步："
echo "  1. 驗證 RLS 已禁用（可選）"
echo "  2. 重新啟動開發伺服器：npm run dev"
echo "  3. 測試新增獎品功能"
echo ""
