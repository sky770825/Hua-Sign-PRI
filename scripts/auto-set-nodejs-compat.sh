#!/bin/bash

# 完全自動化設置 nodejs_compat Compatibility Flag
# 使用 wrangler 認證或 API Token

set -e

ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
PROJECT_NAME="hua-sign-pri"

echo "════════════════════════════════════════════════"
echo "  🤖 自動化設置 nodejs_compat Compatibility Flag"
echo "════════════════════════════════════════════════"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 步驟 1: 檢查 wrangler 是否已登入
echo -e "${BLUE}📋 步驟 1: 檢查 wrangler 認證狀態...${NC}"
if wrangler whoami >/dev/null 2>&1; then
    echo -e "${GREEN}✅ wrangler 已登入${NC}"
    WRANGLER_LOGGED_IN=true
else
    echo -e "${YELLOW}⚠️  wrangler 未登入${NC}"
    WRANGLER_LOGGED_IN=false
fi

# 步驟 2: 嘗試獲取 API Token
echo -e "\n${BLUE}🔑 步驟 2: 檢查 API Token...${NC}"
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${GREEN}✅ 找到環境變數 CLOUDFLARE_API_TOKEN${NC}"
    API_TOKEN="$CLOUDFLARE_API_TOKEN"
elif [ "$WRANGLER_LOGGED_IN" = true ]; then
    echo -e "${YELLOW}⚠️  嘗試從 wrangler 獲取認證信息...${NC}"
    # wrangler 使用 OAuth，無法直接獲取 API Token
    # 但我們可以嘗試使用 wrangler 的內部認證
    echo -e "${YELLOW}   注意: wrangler OAuth token 無法直接用於 API${NC}"
    echo -e "${YELLOW}   需要手動獲取 API Token${NC}"
    API_TOKEN=""
else
    echo -e "${RED}❌ 未找到 API Token${NC}"
    API_TOKEN=""
fi

# 步驟 3: 如果沒有 API Token，引導用戶獲取
if [ -z "$API_TOKEN" ]; then
    echo -e "\n${YELLOW}⚠️  需要 API Token 才能自動設置${NC}"
    echo ""
    echo "請按照以下步驟獲取 API Token："
    echo ""
    echo "1. 前往：https://dash.cloudflare.com/profile/api-tokens"
    echo "2. 點擊「Create Token」（創建令牌）"
    echo "3. 選擇「Edit Cloudflare Workers」模板"
    echo "4. 或自定義權限：Account: Cloudflare Pages: Edit"
    echo "5. 點擊「Continue to summary」"
    echo "6. 點擊「Create Token」"
    echo "7. 複製 Token（只顯示一次）"
    echo ""
    echo "然後執行："
    echo "  export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo "  bash scripts/auto-set-nodejs-compat.sh"
    echo ""
    echo "或者，您可以在 Dashboard 中手動設置（更簡單）："
    echo "  https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions"
    echo ""
    exit 1
fi

# 步驟 4: 使用 API 設置 Compatibility Flags
echo -e "\n${BLUE}⚙️  步驟 3: 設置 Compatibility Flags...${NC}"

RESPONSE=$(curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
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
    echo -e "${GREEN}✅ 成功設置 nodejs_compat Compatibility Flag！${NC}"
    echo ""
    echo "已設置給："
    echo "  - Production（生產環境）"
    echo "  - Preview（預覽環境）"
    echo ""
    
    # 步驟 5: 嘗試觸發新部署
    echo -e "\n${BLUE}🚀 步驟 4: 觸發新部署...${NC}"
    
    # 使用 wrangler 觸發部署（如果已登入）
    if [ "$WRANGLER_LOGGED_IN" = true ]; then
        echo -e "${YELLOW}嘗試使用 wrangler 觸發部署...${NC}"
        # 注意：wrangler pages 可能不支持直接觸發部署
        # 但我們可以推送一個空提交來觸發 GitHub Actions
        echo -e "${YELLOW}推送空提交以觸發自動部署...${NC}"
        git commit --allow-empty -m "觸發部署: 設置 nodejs_compat" 2>/dev/null && \
        git push origin main 2>/dev/null && \
        echo -e "${GREEN}✅ 已推送，將觸發自動部署${NC}" || \
        echo -e "${YELLOW}⚠️  無法自動推送，請手動觸發部署${NC}"
    else
        echo -e "${YELLOW}⚠️  請在 Dashboard 中手動觸發新部署${NC}"
    fi
    
    echo ""
    echo "部署頁面："
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
    echo ""
    echo -e "${GREEN}✅ 設置完成！等待 2-5 分鐘讓部署完成${NC}"
    
else
    echo -e "${RED}❌ 設置失敗${NC}"
    echo ""
    echo "響應："
    echo "$RESPONSE" | head -20
    echo ""
    echo "可能的原因："
    echo "1. API Token 權限不足"
    echo "2. 專案名稱不正確"
    echo "3. API 端點變更"
    echo ""
    echo "建議：在 Dashboard 中手動設置"
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions"
    exit 1
fi
