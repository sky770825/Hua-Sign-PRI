#!/bin/bash

# 使用 Supabase CLI 遷移功能執行 SQL
# 創建遷移文件並推送到遠端資料庫

set -e

echo "════════════════════════════════════════════════"
echo "  🚀 使用 Supabase CLI 遷移執行 SQL"
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

# 創建 migrations 目錄
mkdir -p supabase/migrations

# 創建遷移文件
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_NAME=$(basename "$SQL_FILE" .sql | tr ' ' '_' | tr '[:upper:]' '[:lower:]')
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_${MIGRATION_NAME}.sql"

echo "📝 創建遷移文件: $MIGRATION_FILE"
cp "$SQL_FILE" "$MIGRATION_FILE"
echo "✅ 遷移文件已創建"
echo ""

# 推送到遠端資料庫
echo "🚀 推送遷移到遠端資料庫..."
echo "════════════════════════════════════════════════"
if supabase db push 2>&1; then
  echo "════════════════════════════════════════════════"
  echo ""
  echo "✅ SQL 執行成功！"
  echo ""
  echo "📋 遷移文件已保存: $MIGRATION_FILE"
  echo "   可以保留作為記錄，或刪除："
  echo "   rm $MIGRATION_FILE"
  exit 0
else
  echo "════════════════════════════════════════════════"
  echo ""
  echo "❌ SQL 執行失敗"
  echo ""
  echo "💡 可能的原因："
  echo "   1. 遷移歷史不匹配"
  echo "   2. SQL 語法錯誤"
  echo "   3. 權限問題"
  echo ""
  echo "📋 遷移文件位置: $MIGRATION_FILE"
  echo "   可以檢查文件內容或手動在 Dashboard 中執行"
  exit 1
fi
