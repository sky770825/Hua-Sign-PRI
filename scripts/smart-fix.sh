#!/bin/bash

# 智能自動修復腳本
# 檢查構建失敗原因並提供解決方案

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
SITE_URL="https://hua-sign-pri.pages.dev"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  智能自動修復系統${NC}"
echo -e "${BLUE}  目標: 確保 $SITE_URL 可以正常訪問${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 檢查網站
check_site() {
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>&1 || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# 檢查最新部署狀態
check_deployment_status() {
    LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>&1 | grep "Production" | head -1)
    
    if [ -z "$LATEST_DEPLOY" ]; then
        echo "❌ 沒有找到部署記錄"
        return 1
    fi
    
    DEPLOY_STATUS=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $5}' | xargs)
    DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
    GIT_COMMIT=$(echo "$LATEST_DEPLOY" | awk '{print $4}')
    
    echo "最新部署狀態: $DEPLOY_STATUS"
    echo "部署 ID: $DEPLOY_ID"
    echo "Git 提交: $GIT_COMMIT"
    echo ""
    
    if [ "$DEPLOY_STATUS" = "Failure" ]; then
        echo -e "${RED}❌ 構建失敗！${NC}"
        echo ""
        echo "構建日誌:"
        echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/${DEPLOY_ID}"
        echo ""
        return 1
    elif [ "$DEPLOY_STATUS" = "Success" ] || [ "$DEPLOY_STATUS" = "Active" ]; then
        echo -e "${GREEN}✅ 部署成功${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  部署狀態: $DEPLOY_STATUS${NC}"
        return 1
    fi
}

# 執行修復步驟
execute_fix() {
    echo -e "${BLUE}執行修復步驟...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 1. 確保代碼已推送
    echo "1. 確保代碼已同步到 GitHub..."
    cd "$(dirname "$0")/.."
    
    if [ -n "$(git status --porcelain)" ]; then
        git add -A
        git commit -m "自動修復 - $(date +%Y%m%d-%H%M%S)" || true
    fi
    
    git push origin main 2>&1 | grep -v "Everything up-to-date" || echo "   已是最新"
    echo ""
    
    # 2. 等待 GitHub 同步
    echo "2. 等待 GitHub 同步（10秒）..."
    sleep 10
    echo ""
}

# 主循環
ATTEMPT=0
MAX_ATTEMPTS=5

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  嘗試 $ATTEMPT / $MAX_ATTEMPTS${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════${NC}"
    echo ""
    
    # 檢查網站
    if check_site; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 成功！網站已可正常訪問！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}🌐 網站 URL: $SITE_URL${NC}"
        echo ""
        
        # 執行測試
        echo "執行網站測試..."
        npm run test:site 2>&1 | tail -15
        exit 0
    fi
    
    # 檢查部署狀態
    echo "檢查部署狀態..."
    if ! check_deployment_status; then
        echo -e "${YELLOW}⚠️  構建失敗或部署未完成${NC}"
        echo ""
        echo "必須在 Dashboard 中完成以下設置："
        echo ""
        echo "1. 設置構建命令:"
        echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/builds"
        echo "   設置: 構建命令 = npm run build"
        echo ""
        echo "2. 設置環境變數:"
        echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
        echo ""
    fi
    
    # 執行修復
    execute_fix
    
    # 等待並檢查
    echo "3. 等待部署完成並檢查..."
    WAIT_COUNT=0
    MAX_WAIT=20
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        sleep 15
        WAIT_COUNT=$((WAIT_COUNT + 1))
        
        if check_site; then
            echo ""
            echo -e "${GREEN}✅ 網站已可訪問！${NC}"
            exit 0
        fi
        
        PROGRESS=$((WAIT_COUNT * 100 / MAX_WAIT))
        echo -ne "\r   等待中... ${PROGRESS}% ($WAIT_COUNT/$MAX_WAIT)"
    done
    
    echo ""
    echo -e "${YELLOW}⚠️  嘗試 $ATTEMPT 未成功${NC}"
    echo ""
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "等待 30 秒後重試..."
        sleep 30
        echo ""
    fi
done

echo ""
echo -e "${RED}❌ 已嘗試 $MAX_ATTEMPTS 次，網站仍無法訪問${NC}"
echo ""
echo "必須手動完成以下設置："
echo ""
echo "1. 構建設置:"
echo "   https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/builds"
echo "   構建命令: npm run build"
echo "   構建輸出: 留空或 .next"
echo "   Node.js: 18"
echo ""
echo "2. 環境變數:"
echo "   https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo ""
exit 1
