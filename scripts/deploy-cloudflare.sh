#!/bin/bash

# Cloudflare Pages 自動化部署腳本
# 使用方法: ./scripts/deploy-cloudflare.sh

set -e

echo "🚀 開始 Cloudflare Pages 自動化部署..."

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 wrangler 是否安裝
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  wrangler 未安裝，正在安裝...${NC}"
    npm install -g wrangler
    echo -e "${GREEN}✅ wrangler 安裝完成${NC}"
fi

# 檢查是否已登入 Cloudflare
echo -e "${YELLOW}📋 檢查 Cloudflare 登入狀態...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  未登入 Cloudflare，請先登入...${NC}"
    echo "正在開啟登入流程..."
    wrangler login
else
    echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"
    wrangler whoami
fi

# 專案配置
PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 環境變數
echo -e "${YELLOW}📝 設置環境變數...${NC}"

# 從環境變數或使用預設值
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://sqgrnowrcvspxhuudrqc.supabase.co}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-${SUPABASE_ANON_KEY}}"

# 構建專案
echo -e "${YELLOW}🔨 構建專案...${NC}"
npm install
npm run build

# 檢查專案是否存在
echo -e "${YELLOW}🔍 檢查 Cloudflare Pages 專案...${NC}"
if wrangler pages project list | grep -q "$PROJECT_NAME"; then
    echo -e "${GREEN}✅ 專案已存在${NC}"
else
    echo -e "${YELLOW}📦 創建新專案...${NC}"
    wrangler pages project create "$PROJECT_NAME" --compatibility-date=2024-01-01
fi

# 部署到 Cloudflare Pages
echo -e "${YELLOW}🚀 部署到 Cloudflare Pages...${NC}"

# 使用 wrangler pages deploy
wrangler pages deploy .next \
    --project-name="$PROJECT_NAME" \
    --compatibility-date=2024-01-01 \
    --env NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
    --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
    --env SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"

echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}🌐 您的網站應該可以在 Cloudflare Pages 上訪問了${NC}"

# 顯示專案資訊
echo -e "${YELLOW}📊 專案資訊：${NC}"
wrangler pages project list | grep "$PROJECT_NAME" || echo "無法獲取專案資訊"
