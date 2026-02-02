#!/bin/bash

# 監控部署進度

PROJECT_NAME="hua-sign-pri"
SITE_URL="https://hua-sign-pri.pages.dev"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 監控 Cloudflare Pages 部署進度${NC}"
echo "網站: $SITE_URL"
echo ""

# 獲取最新部署
LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -1)

if [ -n "$LATEST_DEPLOY" ]; then
    DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
    DEPLOY_TIME=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $6}' | xargs)
    
    echo -e "${BLUE}最新部署資訊：${NC}"
    echo "  部署 ID: $DEPLOY_ID"
    echo "  部署時間: $DEPLOY_TIME"
    echo ""
    echo "查看構建日誌："
    echo "  https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/${PROJECT_NAME}/${DEPLOY_ID}"
    echo ""
fi

echo -e "${YELLOW}正在監控網站狀態...${NC}"
echo ""

MAX_RETRIES=30
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 部署成功！網站已可正常訪問！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}🌐 網站 URL: $SITE_URL${NC}"
        echo ""
        SUCCESS=true
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        PROGRESS=$((RETRY_COUNT * 100 / MAX_RETRIES))
        echo -ne "\r檢查中... ${PROGRESS}% ($RETRY_COUNT/$MAX_RETRIES) - HTTP $HTTP_CODE"
        sleep 10
    fi
done

echo ""

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 網站現在可以正常訪問了！${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  部署仍在進行中或構建失敗${NC}"
    echo ""
    echo "請檢查："
    echo "1. 構建日誌中是否有錯誤"
    echo "2. 構建命令是否已設置"
    echo "3. 環境變數是否已設置"
    echo ""
    echo "查看構建日誌："
    if [ -n "$DEPLOY_ID" ]; then
        echo "  https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/${PROJECT_NAME}/${DEPLOY_ID}"
    else
        echo "  https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/${PROJECT_NAME}/deployments"
    fi
    exit 1
fi
