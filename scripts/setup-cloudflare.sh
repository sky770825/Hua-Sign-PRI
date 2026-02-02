#!/bin/bash

# Cloudflare Pages 自動化設置腳本
# 使用方法: ./scripts/setup-cloudflare.sh

set -e

echo "🔧 Cloudflare Pages 自動化設置..."

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 專案配置
PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 步驟 1: 安裝 wrangler
echo -e "${BLUE}📦 步驟 1: 安裝 Cloudflare CLI (wrangler)...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}正在安裝 wrangler...${NC}"
    npm install -g wrangler
    echo -e "${GREEN}✅ wrangler 安裝完成${NC}"
else
    echo -e "${GREEN}✅ wrangler 已安裝${NC}"
    wrangler --version
fi

# 步驟 2: 登入 Cloudflare
echo -e "\n${BLUE}🔐 步驟 2: 登入 Cloudflare...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}請在瀏覽器中完成登入...${NC}"
    wrangler login
else
    echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"
    echo "當前帳號："
    wrangler whoami
fi

# 步驟 3: 創建或檢查專案
echo -e "\n${BLUE}📁 步驟 3: 檢查/創建 Cloudflare Pages 專案...${NC}"
PROJECT_EXISTS=$(wrangler pages project list 2>/dev/null | grep -c "$PROJECT_NAME" || echo "0")

if [ "$PROJECT_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}創建新專案: $PROJECT_NAME...${NC}"
    wrangler pages project create "$PROJECT_NAME" \
        --compatibility-date=2024-01-01 \
        --production-branch=main
    echo -e "${GREEN}✅ 專案創建完成${NC}"
else
    echo -e "${GREEN}✅ 專案已存在${NC}"
fi

# 步驟 4: 設置環境變數
echo -e "\n${BLUE}⚙️  步驟 4: 設置環境變數...${NC}"

# 環境變數值
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
SUPABASE_SERVICE_KEY="$SUPABASE_ANON_KEY"

echo "設置環境變數..."
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_KEY"

# 使用 wrangler pages secret 設置環境變數
# 注意：wrangler pages secret 用於設置敏感資訊，但公開的環境變數需要在 Cloudflare Dashboard 設置
echo -e "${YELLOW}⚠️  注意：環境變數需要在 Cloudflare Dashboard 中設置${NC}"
echo -e "${YELLOW}   請前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables${NC}"

# 步驟 5: 連接 Git 倉庫
echo -e "\n${BLUE}🔗 步驟 5: 連接 Git 倉庫...${NC}"
echo -e "${YELLOW}請在 Cloudflare Dashboard 中手動連接 Git 倉庫：${NC}"
echo "  1. 前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "  2. 點擊「連接 Git 倉庫」"
echo "  3. 選擇 GitHub 並授權"
echo "  4. 選擇倉庫: sky770825/Hua-Sign-PRI"
echo "  5. 分支: main"

# 步驟 6: 構建設置
echo -e "\n${BLUE}🔨 步驟 6: 構建設置...${NC}"
echo "在 Cloudflare Dashboard 中設置："
echo "  - 構建命令: npm run build"
echo "  - 構建輸出目錄: .next"
echo "  - Node.js 版本: 18"
echo "  - 根目錄: / (留空)"

# 完成
echo -e "\n${GREEN}✅ 設置完成！${NC}"
echo -e "\n${BLUE}📋 下一步：${NC}"
echo "1. 在 Cloudflare Dashboard 中設置環境變數"
echo "2. 連接 Git 倉庫"
echo "3. 配置構建設置"
echo "4. 推送到 main 分支以觸發部署"
echo -e "\n${BLUE}🌐 專案 URL: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}${NC}"
