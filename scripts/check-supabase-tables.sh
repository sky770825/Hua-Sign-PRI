#!/bin/bash

# 檢查 Supabase 資料庫表是否已建立
# 使用 Supabase API 檢查

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 檢查 Supabase 資料庫表${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 檢查環境變數
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  未找到 NEXT_PUBLIC_SUPABASE_URL${NC}"
    echo "請設置環境變數或創建 .env.local 文件"
    echo ""
    echo "或直接在 Supabase SQL Editor 中執行："
    echo -e "${GREEN}  check_database_tables.sql${NC}"
    exit 0
fi

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_SERVICE_KEY}}"

if [ -z "$SUPABASE_KEY" ]; then
    echo -e "${YELLOW}⚠️  未找到 Supabase API Key${NC}"
    echo "請設置環境變數或創建 .env.local 文件"
    echo ""
    echo "或直接在 Supabase SQL Editor 中執行："
    echo -e "${GREEN}  check_database_tables.sql${NC}"
    exit 0
fi

echo -e "${BLUE}正在檢查資料庫表...${NC}"
echo ""

# 定義需要檢查的表
TABLES=(
    "estate_attendance_members"
    "estate_attendance_meetings"
    "estate_attendance_checkins"
    "estate_attendance_prizes"
    "estate_attendance_lottery_winners"
)

ALL_EXIST=true

for table in "${TABLES[@]}"; do
    # 嘗試查詢表（使用 Supabase REST API）
    RESPONSE=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -w "\n%{http_code}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "206" ]; then
        echo -e "${GREEN}✅ ${table} 已建立${NC}"
    else
        echo -e "${RED}❌ ${table} 未建立${NC}"
        ALL_EXIST=false
    fi
done

echo ""

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✅ 所有資料表都已建立！${NC}"
    echo ""
    echo "📋 建議執行驗證腳本："
    echo "  在 Supabase SQL Editor 中執行 verify_estate_attendance_tables.sql"
else
    echo -e "${YELLOW}⚠️  部分資料表未建立${NC}"
    echo ""
    echo "📋 請執行以下 SQL 腳本："
    echo "  在 Supabase SQL Editor 中執行 create_estate_attendance_tables_organized.sql"
    echo ""
    echo "🔗 Supabase SQL Editor："
    echo "  https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
