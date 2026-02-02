#!/bin/bash

# Cloudflare Pages 完整設置腳本
# 自動完成所有設置步驟，確保網站可以訪問

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

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Cloudflare Pages 完整自動化設置${NC}"
echo -e "${BLUE}  目標：確保 $SITE_URL 可以正常訪問${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 1. 檢查並安裝 wrangler
echo -e "${BLUE}[1/8] 檢查 Cloudflare CLI...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}正在安裝 wrangler...${NC}"
    npm install -g wrangler
fi
echo -e "${GREEN}✅ 完成${NC}"
echo ""

# 2. 檢查登入
echo -e "${BLUE}[2/8] 檢查 Cloudflare 登入...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}請在瀏覽器中完成登入...${NC}"
    wrangler login
fi
ACCOUNT_INFO=$(wrangler whoami 2>/dev/null | grep "Account ID" | awk '{print $3}' || echo "")
echo -e "${GREEN}✅ 已登入 (Account: $ACCOUNT_INFO)${NC}"
echo ""

# 3. 創建或檢查專案
echo -e "${BLUE}[3/8] 檢查/創建 Cloudflare Pages 專案...${NC}"
PROJECT_EXISTS=$(wrangler pages project list 2>/dev/null | grep -c "$PROJECT_NAME" || echo "0")

if [ "$PROJECT_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}創建新專案...${NC}"
    wrangler pages project create "$PROJECT_NAME" \
        --compatibility-date=2024-01-01 \
        --production-branch="$BRANCH"
    echo -e "${GREEN}✅ 專案已創建${NC}"
else
    echo -e "${GREEN}✅ 專案已存在${NC}"
fi
echo ""

# 4. 確保代碼已推送到 GitHub
echo -e "${BLUE}[4/8] 確保代碼已推送到 GitHub...${NC}"
cd "$(dirname "$0")/.."

# 檢查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}發現未提交的更改，正在提交...${NC}"
    git add -A
    git commit -m "自動部署到 Cloudflare Pages - $(date +%Y%m%d-%H%M%S)" || echo "無新更改"
fi

# 推送到 GitHub
echo -e "${YELLOW}推送到 GitHub...${NC}"
git push origin $BRANCH 2>&1 | grep -v "Everything up-to-date" || echo "已是最新"
echo -e "${GREEN}✅ 代碼已同步到 GitHub${NC}"
echo ""

# 5. 顯示環境變數設置說明
echo -e "${BLUE}[5/8] 環境變數設置...${NC}"
echo -e "${YELLOW}⚠️  環境變數需要在 Dashboard 手動設置${NC}"
echo ""
echo "請前往以下 URL 設置環境變數："
echo -e "${BLUE}https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables${NC}"
echo ""
echo "需要設置的環境變數："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT_PUBLIC_SUPABASE_URL"
echo "  = https://sqgrnowrcvspxhuudrqc.supabase.co"
echo ""
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo ""
echo "SUPABASE_SERVICE_KEY"
echo "  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "按 Enter 繼續（設置完環境變數後）..."
echo ""

# 6. 檢查 Git 倉庫連接
echo -e "${BLUE}[6/8] 檢查 Git 倉庫連接...${NC}"
echo -e "${YELLOW}請確認 Git 倉庫已連接：${NC}"
echo "1. 前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "2. 如果未連接，點擊「連接 Git 倉庫」"
echo "3. 選擇 GitHub 並授權"
echo "4. 選擇倉庫: $GITHUB_REPO"
echo "5. 分支: $BRANCH"
echo ""
read -p "按 Enter 繼續（確認 Git 倉庫已連接）..."
echo ""

# 7. 檢查構建設置
echo -e "${BLUE}[7/8] 檢查構建設置...${NC}"
echo -e "${YELLOW}請確認構建設置：${NC}"
echo "構建命令: npm run build"
echo "構建輸出目錄: .next"
echo "Node.js 版本: 18"
echo "根目錄: / (留空)"
echo ""
read -p "按 Enter 繼續（確認構建設置正確）..."
echo ""

# 8. 觸發部署並檢查
echo -e "${BLUE}[8/8] 觸發部署並檢查網站...${NC}"

# 如果 Git 已連接，推送會觸發自動部署
echo -e "${YELLOW}觸發部署（通過 Git push）...${NC}"
git push origin $BRANCH 2>&1 | grep -v "Everything up-to-date" || echo "已是最新"

echo ""
echo -e "${YELLOW}等待部署完成（這可能需要幾分鐘）...${NC}"

# 檢查網站是否可訪問
MAX_RETRIES=60
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 部署成功！網站已可訪問！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}🌐 網站 URL: $SITE_URL${NC}"
        echo ""
        SUCCESS=true
        break
    elif [ "$HTTP_CODE" = "404" ]; then
        RETRY_COUNT=$((RETRY_COUNT + 1))
        PROGRESS=$((RETRY_COUNT * 100 / MAX_RETRIES))
        echo -ne "\r等待部署... ${PROGRESS}% ($RETRY_COUNT/$MAX_RETRIES) - HTTP $HTTP_CODE"
        sleep 10
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        PROGRESS=$((RETRY_COUNT * 100 / MAX_RETRIES))
        echo -ne "\r等待部署... ${PROGRESS}% ($RETRY_COUNT/$MAX_RETRIES) - HTTP $HTTP_CODE"
        sleep 10
    fi
done

echo ""

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 完成！網站現在可以正常訪問了！${NC}"
    exit 0
else
    echo -e "${RED}❌ 部署超時或失敗${NC}"
    echo ""
    echo -e "${YELLOW}請檢查：${NC}"
    echo "1. Dashboard: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
    echo "2. 構建日誌中是否有錯誤"
    echo "3. 環境變數是否正確設置"
    echo "4. Git 倉庫是否已連接"
    echo ""
    exit 1
fi
