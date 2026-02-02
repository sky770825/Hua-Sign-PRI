#!/bin/bash

# 持續自動修復直到網站可以打開
# 後台運行，定期檢查並修復

PROJECT_NAME="hua-sign-pri"
SITE_URL="https://hua-sign-pri.pages.dev"
CHECK_INTERVAL=30  # 每30秒檢查一次
MAX_ITERATIONS=60   # 最多檢查60次（30分鐘）

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  持續自動修復系統${NC}"
echo -e "${BLUE}  目標: $SITE_URL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

ITERATION=0
LAST_DEPLOY_ID=""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    
    echo -e "${BLUE}[檢查 $ITERATION/$MAX_ITERATIONS] $(date '+%H:%M:%S')${NC}"
    
    # 檢查網站
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>&1 || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ✅ 成功！網站已可正常訪問！${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}🌐 網站 URL: $SITE_URL${NC}"
        echo -e "${GREEN}HTTP 狀態碼: $HTTP_CODE${NC}"
        echo ""
        
        # 執行快速測試
        echo "執行快速測試..."
        npm run check:cloudflare 2>&1 | tail -5
        echo ""
        
        exit 0
    else
        echo "  狀態: HTTP $HTTP_CODE"
        
        # 檢查是否有新部署
        CURRENT_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -1 | awk '{print $1}' || echo "")
        
        if [ -n "$CURRENT_DEPLOY" ] && [ "$CURRENT_DEPLOY" != "$LAST_DEPLOY_ID" ]; then
            echo "  發現新部署: $CURRENT_DEPLOY"
            LAST_DEPLOY_ID="$CURRENT_DEPLOY"
        fi
        
        # 每10次檢查觸發一次修復
        if [ $((ITERATION % 10)) -eq 0 ]; then
            echo "  執行修復步驟..."
            cd "$(dirname "$0")/.."
            
            # 提交並推送
            if [ -n "$(git status --porcelain)" ]; then
                git add -A
                git commit -m "自動修復 - $(date +%Y%m%d-%H%M%S)" || true
            fi
            git push origin main 2>&1 | grep -v "Everything up-to-date" || true
        fi
    fi
    
    # 等待
    if [ $ITERATION -lt $MAX_ITERATIONS ]; then
        echo "  等待 ${CHECK_INTERVAL} 秒後再次檢查..."
        sleep $CHECK_INTERVAL
        echo ""
    fi
done

echo ""
echo -e "${RED}❌ 已檢查 $MAX_ITERATIONS 次，網站仍無法訪問${NC}"
echo ""
echo "請手動檢查構建日誌和設置"
exit 1
