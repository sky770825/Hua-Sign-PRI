#!/bin/bash

# Supabase 資料庫備份腳本
# 使用 Supabase CLI 或 API 備份資料庫

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📦 Supabase 資料庫備份${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 檢查 Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI 未安裝${NC}"
    echo ""
    echo "安裝方式："
    echo "  npm install -g supabase"
    echo ""
    echo "或使用 SQL 文件手動備份："
    echo "  1. backup_database.sql - 備份結構"
    echo "  2. export_database_data.sql - 導出數據"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI 已安裝${NC}"
echo ""

# 備份選項
echo "請選擇備份方式："
echo "1. 備份資料庫結構（推薦）"
echo "2. 導出數據為 SQL"
echo "3. 完整備份（結構 + 數據）"
echo ""
read -p "請選擇 (1-3): " choice

case $choice in
    1)
        echo -e "${BLUE}正在備份資料庫結構...${NC}"
        echo ""
        echo "請在 Supabase Dashboard 中執行："
        echo "  backup_database.sql"
        echo ""
        echo "或使用 Supabase CLI："
        echo "  supabase db dump --schema public > backup_structure.sql"
        ;;
    2)
        echo -e "${BLUE}正在導出數據...${NC}"
        echo ""
        echo "請在 Supabase Dashboard 中執行："
        echo "  export_database_data.sql"
        echo ""
        echo "或使用 Supabase CLI："
        echo "  supabase db dump --data-only > backup_data.sql"
        ;;
    3)
        echo -e "${BLUE}正在執行完整備份...${NC}"
        echo ""
        echo "請在 Supabase Dashboard 中執行："
        echo "  1. backup_database.sql（結構）"
        echo "  2. export_database_data.sql（數據）"
        echo ""
        echo "或使用 Supabase CLI："
        echo "  supabase db dump > backup_full.sql"
        ;;
    *)
        echo -e "${RED}❌ 無效的選擇${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ 備份說明已顯示${NC}"
echo ""
echo "📋 備份文件位置："
echo "  - backup_database.sql（結構備份）"
echo "  - export_database_data.sql（數據導出）"
