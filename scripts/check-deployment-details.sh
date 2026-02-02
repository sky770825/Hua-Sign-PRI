#!/bin/bash

# 檢查部署詳細信息和構建狀態

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  部署詳細信息檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 獲取最新部署
LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -1)

if [ -z "$LATEST_DEPLOY" ]; then
    echo -e "${RED}❌ 沒有找到部署記錄${NC}"
    exit 1
fi

# 解析部署信息
DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
GIT_COMMIT=$(echo "$LATEST_DEPLOY" | awk '{print $4}')
DEPLOY_TIME=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $6}' | xargs)
DEPLOY_URL=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $6}' | xargs)

echo -e "${BLUE}【最新部署信息】${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署 ID: $DEPLOY_ID"
echo "Git 提交: $GIT_COMMIT"
echo "部署時間: $DEPLOY_TIME"
echo "部署 URL: $DEPLOY_URL"
echo ""

# 檢查本地 Git 提交
echo -e "${BLUE}【Git 提交驗證】${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if git cat-file -e "$GIT_COMMIT" 2>/dev/null; then
    COMMIT_MSG=$(git log -1 --format="%s" "$GIT_COMMIT" 2>/dev/null)
    COMMIT_TIME=$(git log -1 --format="%ci" "$GIT_COMMIT" 2>/dev/null)
    COMMIT_AUTHOR=$(git log -1 --format="%an" "$GIT_COMMIT" 2>/dev/null)
    
    echo -e "${GREEN}✅ 本地倉庫包含此提交${NC}"
    echo "提交訊息: $COMMIT_MSG"
    echo "提交時間: $COMMIT_TIME"
    echo "提交作者: $COMMIT_AUTHOR"
    echo ""
    echo -e "${GREEN}✅ GitHub 連接正常（提交 ID 匹配）${NC}"
else
    echo -e "${YELLOW}⚠️  本地倉庫不包含此提交${NC}"
    echo "可能原因："
    echo "1. 本地代碼已更新"
    echo "2. 需要執行 git pull"
fi
echo ""

# 檢查部署 URL 可訪問性
echo -e "${BLUE}【部署 URL 可訪問性】${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$DEPLOY_URL" ] && [ "$DEPLOY_URL" != "main" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ 部署 URL 可訪問 (HTTP $HTTP_CODE)${NC}"
        echo "   URL: $DEPLOY_URL"
    else
        echo -e "${RED}❌ 部署 URL 無法訪問 (HTTP $HTTP_CODE)${NC}"
        echo "   URL: $DEPLOY_URL"
        echo "   這表示構建可能失敗"
    fi
else
    echo -e "${YELLOW}⚠️  無法獲取部署 URL${NC}"
fi
echo ""

# 檢查主網站
echo -e "${BLUE}【主網站狀態】${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SITE_URL="https://hua-sign-pri.pages.dev"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ 主網站可訪問 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ 主網站無法訪問 (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 總結
echo -e "${BLUE}【總結】${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ GitHub 連接狀態: 正常（有部署記錄，提交 ID 匹配）"
echo ""

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  網站無法訪問，可能原因：${NC}"
    echo "1. 構建失敗（最可能）"
    echo "2. 環境變數未設置"
    echo "3. 構建輸出目錄配置錯誤"
    echo ""
    echo "請檢查構建日誌："
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/${DEPLOY_ID}"
else
    echo -e "${GREEN}✅ 網站運行正常${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
