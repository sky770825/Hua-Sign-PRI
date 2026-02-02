#!/bin/bash

# 檢查 Cloudflare Pages 與 GitHub 的連接狀態

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Cloudflare Pages 與 GitHub 連接狀態檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 1. 檢查專案狀態
echo -e "${BLUE}【1】專案狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v wrangler &> /dev/null; then
    PROJECT_INFO=$(wrangler pages project list 2>/dev/null | grep "$PROJECT_NAME")
    if [ -n "$PROJECT_INFO" ]; then
        echo -e "${GREEN}✅ 專案存在${NC}"
        echo "   資訊: $PROJECT_INFO"
    else
        echo -e "${RED}❌ 專案不存在${NC}"
    fi
else
    echo -e "${RED}❌ wrangler 未安裝${NC}"
fi
echo ""

# 2. 檢查部署歷史
echo -e "${BLUE}【2】部署歷史${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v wrangler &> /dev/null; then
    DEPLOYMENTS=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null)
    
    if [ -n "$DEPLOYMENTS" ]; then
        DEPLOY_COUNT=$(echo "$DEPLOYMENTS" | grep -c "Production" || echo "0")
        echo -e "${GREEN}✅ 有 $DEPLOY_COUNT 個生產環境部署${NC}"
        echo ""
        echo "最新 5 個部署："
        echo "$DEPLOYMENTS" | grep "Production" | head -5 | while IFS= read -r line; do
            DEPLOY_ID=$(echo "$line" | awk '{print $1}')
            DEPLOY_TIME=$(echo "$line" | awk -F'│' '{print $6}' | xargs)
            DEPLOY_STATUS=$(echo "$line" | awk -F'│' '{print $5}' | xargs)
            DEPLOY_URL=$(echo "$line" | awk -F'│' '{print $6}' | xargs)
            
            echo "  • 部署 ID: $DEPLOY_ID"
            echo "    時間: $DEPLOY_TIME"
            echo "    狀態: $DEPLOY_STATUS"
            echo "    URL: $DEPLOY_URL"
            echo ""
        done
    else
        echo -e "${RED}❌ 沒有部署記錄${NC}"
    fi
else
    echo -e "${RED}❌ 無法檢查（wrangler 未安裝）${NC}"
fi
echo ""

# 3. 檢查 Git 連接狀態（通過部署記錄推斷）
echo -e "${BLUE}【3】Git 連接狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$DEPLOYMENTS" ]; then
    echo -e "${GREEN}✅ 有部署記錄，表示 Git 可能已連接${NC}"
    echo ""
    echo "最新部署的 Git 提交："
    LATEST_DEPLOY=$(echo "$DEPLOYMENTS" | grep "Production" | head -1)
    if [ -n "$LATEST_DEPLOY" ]; then
        GIT_COMMIT=$(echo "$LATEST_DEPLOY" | awk '{print $4}')
        echo "  Git 提交: $GIT_COMMIT"
        
        # 檢查本地是否有這個提交
        if git cat-file -e "$GIT_COMMIT" 2>/dev/null; then
            COMMIT_MSG=$(git log -1 --format="%s" "$GIT_COMMIT" 2>/dev/null || echo "N/A")
            COMMIT_TIME=$(git log -1 --format="%ci" "$GIT_COMMIT" 2>/dev/null || echo "N/A")
            echo -e "${GREEN}  ✅ 本地倉庫包含此提交${NC}"
            echo "  提交訊息: $COMMIT_MSG"
            echo "  提交時間: $COMMIT_TIME"
        else
            echo -e "${YELLOW}  ⚠️  本地倉庫不包含此提交（可能已更新）${NC}"
        fi
    fi
else
    echo -e "${RED}❌ 沒有部署記錄，無法確認 Git 連接狀態${NC}"
fi
echo ""

# 4. 檢查本地 Git 狀態
echo -e "${BLUE}【4】本地 Git 狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d ".git" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "")
    
    if [ -n "$REMOTE_URL" ]; then
        echo -e "${GREEN}✅ Git 倉庫已配置${NC}"
        echo "   遠端: $REMOTE_URL"
        echo "   當前分支: $CURRENT_BRANCH"
        echo "   最新提交: $LAST_COMMIT"
        
        # 檢查是否有未推送的提交
        LOCAL_COMMITS=$(git log origin/$CURRENT_BRANCH..HEAD 2>/dev/null | grep -c "^commit" || echo "0")
        if [ "$LOCAL_COMMITS" -gt "0" ]; then
            echo -e "${YELLOW}  ⚠️  有 $LOCAL_COMMITS 個未推送的提交${NC}"
        else
            echo -e "${GREEN}  ✅ 代碼已同步${NC}"
        fi
    else
        echo -e "${RED}❌ 未配置遠端倉庫${NC}"
    fi
else
    echo -e "${RED}❌ 不是 Git 倉庫${NC}"
fi
echo ""

# 5. 檢查網站可訪問性
echo -e "${BLUE}【5】網站可訪問性${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SITE_URL="https://hua-sign-pri.pages.dev"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 網站可正常訪問 (HTTP $HTTP_CODE)${NC}"
    echo "   URL: $SITE_URL"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ 網站返回 404${NC}"
    echo "   URL: $SITE_URL"
    echo "   可能原因: 構建失敗或未完成"
else
    echo -e "${YELLOW}⚠️  網站狀態異常 (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 6. 總結和建議
echo -e "${BLUE}【6】總結和建議${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  網站無法訪問，需要檢查：${NC}"
    echo ""
    echo "1. 構建日誌"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
    echo ""
    echo "2. 環境變數"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
    echo ""
    echo "3. Git 連接狀態"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
    echo "   確認 Git 倉庫已連接"
else
    echo -e "${GREEN}✅ 網站運行正常${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
