#!/bin/bash

# 自動修復直到網站可以打開
# 持續檢查、診斷、修復，直到網站正常運作

set -e

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
SITE_URL="https://hua-sign-pri.pages.dev"
MAX_ATTEMPTS=10
ATTEMPT=0

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  自動修復直到網站可以打開${NC}"
echo -e "${BLUE}  目標: $SITE_URL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 檢查函數
check_site() {
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# 診斷函數
diagnose() {
    echo -e "${BLUE}【診斷 $ATTEMPT】檢查問題...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 1. 檢查網站
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    echo "網站狀態: HTTP $HTTP_CODE"
    
    # 2. 檢查最新部署
    LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -1)
    if [ -n "$LATEST_DEPLOY" ]; then
        DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
        DEPLOY_TIME=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $6}' | xargs)
        echo "最新部署: $DEPLOY_ID"
        echo "部署時間: $DEPLOY_TIME"
    fi
    
    echo ""
}

# 修復函數
fix_issues() {
    echo -e "${BLUE}【修復 $ATTEMPT】執行修復步驟...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 1. 確保代碼已推送
    echo "1. 檢查 Git 狀態..."
    if [ -n "$(git status --porcelain)" ]; then
        echo "   提交未提交的更改..."
        git add -A
        git commit -m "自動修復 Cloudflare Pages - $(date +%Y%m%d-%H%M%S)" || true
    fi
    
    echo "   推送到 GitHub..."
    git push origin main 2>&1 | grep -v "Everything up-to-date" || echo "   已是最新"
    echo ""
    
    # 2. 觸發新部署
    echo "2. 觸發新部署..."
    echo "   等待 10 秒讓 GitHub 同步..."
    sleep 10
    echo ""
    
    # 3. 等待部署完成
    echo "3. 等待部署完成..."
    echo "   這可能需要 2-5 分鐘..."
    echo ""
}

# 主循環
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
        echo "執行完整測試..."
        npm run test:site 2>&1 | tail -20
        exit 0
    fi
    
    # 診斷問題
    diagnose
    
    # 執行修復
    fix_issues
    
    # 等待並檢查
    echo "4. 等待並檢查網站狀態..."
    WAIT_COUNT=0
    MAX_WAIT=30
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        sleep 10
        WAIT_COUNT=$((WAIT_COUNT + 1))
        
        if check_site; then
            echo ""
            echo -e "${GREEN}✅ 網站已可訪問！${NC}"
            echo ""
            echo "執行完整測試..."
            npm run test:site 2>&1 | tail -20
            exit 0
        fi
        
        PROGRESS=$((WAIT_COUNT * 100 / MAX_WAIT))
        echo -ne "\r   等待中... ${PROGRESS}% ($WAIT_COUNT/$MAX_WAIT)"
    done
    
    echo ""
    echo -e "${YELLOW}⚠️  嘗試 $ATTEMPT 未成功${NC}"
    echo ""
    
    # 如果還有嘗試次數，繼續
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "等待 30 秒後重試..."
        sleep 30
        echo ""
    fi
done

# 所有嘗試都失敗
echo ""
echo -e "${RED}════════════════════════════════════════════════${NC}"
echo -e "${RED}  ❌ 已嘗試 $MAX_ATTEMPTS 次，網站仍無法訪問${NC}"
echo -e "${RED}════════════════════════════════════════════════${NC}"
echo ""
echo "請手動檢查："
echo "1. 構建日誌: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
echo "2. 構建設置: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/builds"
echo "3. 環境變數: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo ""
echo "可能需要的操作："
echo "- 設置構建命令: npm run build"
echo "- 設置環境變數（3個）"
echo "- 確認 Node.js 版本為 18"
echo ""
exit 1
