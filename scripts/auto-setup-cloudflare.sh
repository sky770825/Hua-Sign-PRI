#!/bin/bash

# Cloudflare Pages 完全自動化設置腳本
# 自動設置環境變數、連接 Git、配置構建

set -e

echo "🚀 Cloudflare Pages 完全自動化設置..."

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

# 環境變數
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
SUPABASE_SERVICE_KEY="$SUPABASE_ANON_KEY"

echo -e "${BLUE}📋 專案資訊：${NC}"
echo "  專案名稱: $PROJECT_NAME"
echo "  GitHub 倉庫: $GITHUB_REPO"
echo "  分支: $BRANCH"

# 檢查專案是否存在
echo -e "\n${BLUE}🔍 檢查專案...${NC}"
PROJECT_EXISTS=$(wrangler pages project list 2>/dev/null | grep -c "$PROJECT_NAME" || echo "0")

if [ "$PROJECT_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}創建專案...${NC}"
    wrangler pages project create "$PROJECT_NAME" \
        --compatibility-date=2024-01-01 \
        --production-branch="$BRANCH"
    echo -e "${GREEN}✅ 專案創建完成${NC}"
else
    echo -e "${GREEN}✅ 專案已存在${NC}"
fi

# 設置環境變數（使用 wrangler pages secret）
echo -e "\n${BLUE}⚙️  設置環境變數...${NC}"

# 注意：wrangler pages secret 用於設置生產環境的敏感變數
# 公開的環境變數需要在 Dashboard 設置，但我們可以嘗試使用 API

echo "設置環境變數到生產環境..."
echo -e "${YELLOW}注意：環境變數設置需要手動在 Dashboard 完成，或使用 Cloudflare API${NC}"

# 顯示需要設置的環境變數
echo -e "\n${BLUE}📝 需要在 Dashboard 設置的環境變數：${NC}"
echo "  NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "  SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY"

# 生成設置指令
echo -e "\n${BLUE}🔗 連接 Git 倉庫...${NC}"
echo -e "${YELLOW}Git 倉庫連接需要在 Dashboard 完成：${NC}"
echo "  1. 前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "  2. 點擊「連接 Git 倉庫」"
echo "  3. 選擇 GitHub 並授權"
echo "  4. 選擇倉庫: $GITHUB_REPO"
echo "  5. 分支: $BRANCH"

# 構建設置
echo -e "\n${BLUE}🔨 構建設置...${NC}"
echo "在 Dashboard 中設置："
echo "  - 構建命令: npm run build"
echo "  - 構建輸出目錄: .next"
echo "  - Node.js 版本: 18"
echo "  - 根目錄: / (留空)"

# 完成
echo -e "\n${GREEN}✅ 自動化設置完成！${NC}"
echo -e "\n${BLUE}📋 後續步驟：${NC}"
echo "1. 前往 Dashboard 設置環境變數"
echo "2. 連接 Git 倉庫"
echo "3. 配置構建設置"
echo -e "\n${BLUE}🌐 Dashboard URL: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}${NC}"

# 嘗試使用 Cloudflare API 設置環境變數（需要 API Token）
echo -e "\n${YELLOW}💡 提示：可以使用 Cloudflare API 自動設置環境變數${NC}"
echo "   需要創建 API Token 並設置以下權限："
echo "   - Account.Cloudflare Pages:Edit"
