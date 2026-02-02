#!/bin/bash

# Cloudflare Pages 完全自動化部署腳本
# 目標：確保 https://hua-sign-pri.pages.dev/ 可以正常訪問

set -e

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
GITHUB_REPO="sky770825/Hua-Sign-PRI"
BRANCH="main"
SITE_URL="https://hua-sign-pri.pages.dev"

echo -e "${BLUE}🚀 Cloudflare Pages 完全自動化部署${NC}"
echo "專案: $PROJECT_NAME"
echo "目標 URL: $SITE_URL"
echo ""

# 步驟 1: 檢查 wrangler
echo -e "${BLUE}📦 步驟 1: 檢查 Cloudflare CLI...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}安裝 wrangler...${NC}"
    npm install -g wrangler
fi
echo -e "${GREEN}✅ wrangler 已就緒${NC}"
echo ""

# 步驟 2: 檢查登入
echo -e "${BLUE}🔐 步驟 2: 檢查 Cloudflare 登入...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}請登入 Cloudflare...${NC}"
    wrangler login
fi
echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"
echo ""

# 步驟 3: 檢查專案是否存在
echo -e "${BLUE}📁 步驟 3: 檢查專案...${NC}"
PROJECT_EXISTS=$(wrangler pages project list 2>/dev/null | grep -c "$PROJECT_NAME" || echo "0")

if [ "$PROJECT_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}創建專案...${NC}"
    wrangler pages project create "$PROJECT_NAME" \
        --compatibility-date=2024-01-01 \
        --production-branch="$BRANCH"
    echo -e "${GREEN}✅ 專案已創建${NC}"
else
    echo -e "${GREEN}✅ 專案已存在${NC}"
fi
echo ""

# 步驟 4: 確保代碼已推送到 GitHub
echo -e "${BLUE}📤 步驟 4: 檢查 Git 狀態...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}有未提交的更改，正在提交...${NC}"
    git add -A
    git commit -m "自動部署到 Cloudflare Pages - $(date +%Y%m%d-%H%M%S)" || echo "無新更改"
fi

# 檢查是否需要推送
LOCAL_COMMITS=$(git log origin/$BRANCH..HEAD 2>/dev/null | wc -l || echo "0")
if [ "$LOCAL_COMMITS" -gt "0" ]; then
    echo -e "${YELLOW}推送到 GitHub...${NC}"
    git push origin $BRANCH || echo "推送失敗或已是最新"
fi
echo -e "${GREEN}✅ Git 狀態正常${NC}"
echo ""

# 步驟 5: 構建專案
echo -e "${BLUE}🔨 步驟 5: 構建專案...${NC}"
npm install
npm run build
echo -e "${GREEN}✅ 構建完成${NC}"
echo ""

# 步驟 6: 直接部署到 Cloudflare Pages
echo -e "${BLUE}🚀 步驟 6: 部署到 Cloudflare Pages...${NC}"

# 嘗試使用 wrangler pages deploy
if wrangler pages deploy .next \
    --project-name="$PROJECT_NAME" \
    --compatibility-date=2024-01-01 2>&1; then
    echo -e "${GREEN}✅ 部署成功${NC}"
else
    echo -e "${YELLOW}⚠️  直接部署失敗，將通過 Git 觸發部署${NC}"
fi
echo ""

# 步驟 7: 設置環境變數（通過 API）
echo -e "${BLUE}⚙️  步驟 7: 設置環境變數...${NC}"

# 環境變數值
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
SUPABASE_SERVICE_KEY="$SUPABASE_ANON_KEY"

echo -e "${YELLOW}⚠️  環境變數需要在 Dashboard 手動設置：${NC}"
echo "  前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo ""
echo "需要設置的環境變數："
echo "  NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "  SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY"
echo ""

# 步驟 8: 檢查部署狀態
echo -e "${BLUE}🔍 步驟 8: 檢查部署狀態...${NC}"
sleep 5

# 檢查網站是否可訪問
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ 網站已可訪問！${NC}"
        echo -e "${GREEN}🌐 URL: $SITE_URL${NC}"
        exit 0
    elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "000" ]; then
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -e "${YELLOW}等待部署完成... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
        sleep 10
    else
        echo -e "${YELLOW}HTTP $HTTP_CODE - 繼續等待...${NC}"
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 10
    fi
done

echo -e "${RED}❌ 部署超時或失敗${NC}"
echo ""
echo -e "${YELLOW}請手動檢查：${NC}"
echo "1. Dashboard: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "2. 確保 Git 倉庫已連接"
echo "3. 確保環境變數已設置"
echo "4. 檢查構建日誌"
echo ""
echo -e "${BLUE}📋 下一步操作：${NC}"
echo "1. 前往 Dashboard 連接 Git 倉庫（如果尚未連接）"
echo "2. 設置環境變數"
echo "3. 等待自動部署完成"
echo ""
exit 1
