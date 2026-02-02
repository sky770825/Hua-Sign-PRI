#!/bin/bash

# 智能自動化設置 nodejs_compat
# 會嘗試所有可能的方式，包括引導獲取 API Token

set -e

ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
PROJECT_NAME="hua-sign-pri"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🤖 智能自動化設置 nodejs_compat${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 檢查並設置 API Token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  未找到 CLOUDFLARE_API_TOKEN${NC}"
    echo ""
    echo "正在嘗試自動獲取..."
    echo ""
    
    # 檢查是否有保存的 token（不安全，但可以嘗試）
    if [ -f ".cloudflare-token" ]; then
        echo -e "${CYAN}找到保存的 token 文件${NC}"
        export CLOUDFLARE_API_TOKEN=$(cat .cloudflare-token | tr -d '\n')
        echo -e "${GREEN}✅ 已載入保存的 token${NC}"
    else
        echo -e "${YELLOW}需要 API Token 才能自動設置${NC}"
        echo ""
        echo "請選擇："
        echo "1. 獲取 API Token 並設置（推薦）"
        echo "2. 使用 Dashboard 手動設置（更簡單）"
        echo ""
        echo -e "${CYAN}選項 1: 獲取 API Token${NC}"
        echo "1. 前往：https://dash.cloudflare.com/profile/api-tokens"
        echo "2. 點擊「Create Token」"
        echo "3. 選擇「Edit Cloudflare Workers」模板"
        echo "4. 點擊「Continue to summary」"
        echo "5. 點擊「Create Token」"
        echo "6. 複製 Token"
        echo ""
        echo "然後執行："
        echo -e "${GREEN}  export CLOUDFLARE_API_TOKEN='your-token-here'${NC}"
        echo -e "${GREEN}  npm run setup:nodejs-compat${NC}"
        echo ""
        echo -e "${CYAN}選項 2: Dashboard 手動設置（推薦，更簡單）${NC}"
        echo "直接前往："
        echo -e "${GREEN}https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions${NC}"
        echo ""
        echo "操作步驟："
        echo "1. 找到「Compatibility Flags」輸入框"
        echo "2. 輸入: nodejs_compat"
        echo "3. 勾選 Production 和 Preview"
        echo "4. 點擊「Save」"
        echo "5. 觸發新部署"
        echo ""
        
        # 不自動打開瀏覽器，只提供連結
        echo ""
        echo -e "${CYAN}請手動複製以下連結到瀏覽器中打開：${NC}"
        echo -e "${GREEN}https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions${NC}"
        
        exit 0
    fi
fi

# 使用 API 設置
echo -e "${BLUE}正在使用 API 設置...${NC}"

RESPONSE=$(curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "compatibility_flags": ["nodejs_compat"],
        "compatibility_date": "2024-09-23"
      },
      "preview": {
        "compatibility_flags": ["nodejs_compat"],
        "compatibility_date": "2024-09-23"
      }
    }
  }')

# 檢查響應
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ 成功設置 nodejs_compat！${NC}"
    echo ""
    echo "已設置給："
    echo "  - Production（生產環境）"
    echo "  - Preview（預覽環境）"
    echo ""
    
    # 觸發部署
    echo -e "${BLUE}觸發新部署...${NC}"
    git commit --allow-empty -m "觸發部署: nodejs_compat 已設置" 2>/dev/null && \
    git push origin main 2>/dev/null && \
    echo -e "${GREEN}✅ 已觸發自動部署${NC}" || \
    echo -e "${YELLOW}⚠️  請手動觸發部署${NC}"
    
    echo ""
    echo -e "${GREEN}✅ 設置完成！等待 2-5 分鐘讓部署完成${NC}"
    echo ""
    echo "檢查部署狀態："
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
    
else
    echo -e "${RED}❌ 設置失敗${NC}"
    echo ""
    echo "響應："
    echo "$RESPONSE" | head -10
    echo ""
    echo "建議：在 Dashboard 中手動設置"
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions"
    exit 1
fi
