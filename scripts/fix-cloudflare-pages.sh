#!/bin/bash

# 自動修復 Cloudflare Pages 部署問題
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
SITE_URL="https://hua-sign-pri.pages.dev"

echo -e "${BLUE}🔧 自動修復 Cloudflare Pages 部署${NC}"
echo "目標: $SITE_URL"
echo ""

# 1. 檢查網站狀態
echo -e "${BLUE}[1/6] 檢查網站狀態...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 網站已可正常訪問！${NC}"
    echo -e "${GREEN}🌐 $SITE_URL${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  網站無法訪問 (HTTP $HTTP_CODE)${NC}"
    echo "開始修復..."
fi
echo ""

# 2. 確保代碼已推送
echo -e "${BLUE}[2/6] 確保代碼已推送到 GitHub...${NC}"
cd "$(dirname "$0")/.."

# 提交並推送
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}提交更改...${NC}"
    git add -A
    git commit -m "自動修復 Cloudflare Pages 部署 - $(date +%Y%m%d-%H%M%S)" || true
fi

echo -e "${YELLOW}推送到 GitHub...${NC}"
git push origin main 2>&1 | grep -v "Everything up-to-date" || echo "已是最新"
echo -e "${GREEN}✅ 代碼已同步${NC}"
echo ""

# 3. 檢查專案狀態
echo -e "${BLUE}[3/6] 檢查 Cloudflare Pages 專案...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}安裝 wrangler...${NC}"
    npm install -g wrangler
fi

if wrangler whoami &> /dev/null; then
    echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"
    
    # 檢查專案
    if wrangler pages project list 2>/dev/null | grep -q "$PROJECT_NAME"; then
        echo -e "${GREEN}✅ 專案存在${NC}"
    else
        echo -e "${YELLOW}創建專案...${NC}"
        wrangler pages project create "$PROJECT_NAME" --compatibility-date=2024-01-01 --production-branch=main
    fi
else
    echo -e "${YELLOW}⚠️  未登入 Cloudflare，請執行: wrangler login${NC}"
fi
echo ""

# 4. 顯示需要手動完成的步驟
echo -e "${BLUE}[4/6] 需要手動完成的步驟：${NC}"
echo ""
echo -e "${YELLOW}步驟 1: 連接 Git 倉庫${NC}"
echo "  前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "  如果未連接，點擊「連接 Git 倉庫」"
echo "  選擇: sky770825/Hua-Sign-PRI (main 分支)"
echo ""

echo -e "${YELLOW}步驟 2: 設置環境變數${NC}"
echo "  前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo "  添加以下環境變數："
echo ""
echo "  NEXT_PUBLIC_SUPABASE_URL"
echo "  = https://sqgrnowrcvspxhuudrqc.supabase.co"
echo ""
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo ""
echo "  SUPABASE_SERVICE_KEY"
echo "  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo ""

echo -e "${YELLOW}步驟 3: 檢查構建設置${NC}"
echo "  構建命令: npm run build"
echo "  構建輸出: .next"
echo "  Node.js 版本: 18"
echo ""

# 5. 等待並檢查部署
echo -e "${BLUE}[5/6] 等待部署完成...${NC}"
echo -e "${YELLOW}請完成上述步驟後，等待 2-3 分鐘讓部署完成...${NC}"
echo ""

# 6. 持續檢查網站狀態
echo -e "${BLUE}[6/6] 持續檢查網站狀態...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 成功！網站已可正常訪問！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}🌐 網站 URL: $SITE_URL${NC}"
        echo ""
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        PROGRESS=$((RETRY_COUNT * 100 / MAX_RETRIES))
        echo -ne "\r檢查中... ${PROGRESS}% ($RETRY_COUNT/$MAX_RETRIES) - HTTP $HTTP_CODE"
        sleep 10
    fi
done

echo ""
echo -e "${RED}❌ 超時：網站仍未可訪問${NC}"
echo ""
echo -e "${YELLOW}請檢查：${NC}"
echo "1. Dashboard: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "2. 構建日誌中是否有錯誤"
echo "3. 環境變數是否已正確設置"
echo "4. Git 倉庫是否已連接"
echo ""
exit 1
