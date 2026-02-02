#!/bin/bash

# 完全自動化設置腳本 - 包含獲取 API Token 的引導
# 這個腳本會嘗試所有可能的方式自動設置 nodejs_compat

set -e

ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
PROJECT_NAME="hua-sign-pri"

echo "════════════════════════════════════════════════"
echo "  🚀 完全自動化設置 nodejs_compat"
echo "════════════════════════════════════════════════"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 方法 1: 嘗試使用 wrangler.toml（已創建）
echo -e "${BLUE}📋 方法 1: 檢查 wrangler.toml 文件...${NC}"
if [ -f "wrangler.toml" ]; then
    echo -e "${GREEN}✅ wrangler.toml 已存在${NC}"
    echo "   文件已包含 nodejs_compat 設置"
    echo ""
    echo "   如果 Cloudflare Pages 使用 V2 構建系統，"
    echo "   會自動讀取此文件並應用設置。"
    echo ""
    echo -e "${YELLOW}⚠️  但為了確保設置生效，建議使用 API 或 Dashboard${NC}"
else
    echo -e "${YELLOW}⚠️  wrangler.toml 不存在${NC}"
fi

# 方法 2: 嘗試使用 API（需要 API Token）
echo -e "\n${BLUE}📋 方法 2: 嘗試使用 Cloudflare API...${NC}"

if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${GREEN}✅ 找到 API Token${NC}"
    echo -e "${CYAN}正在使用 API 設置...${NC}"
    
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
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ API 設置成功！${NC}"
        API_SUCCESS=true
    else
        echo -e "${RED}❌ API 設置失敗${NC}"
        echo "響應: $RESPONSE" | head -5
        API_SUCCESS=false
    fi
else
    echo -e "${YELLOW}⚠️  未找到 CLOUDFLARE_API_TOKEN 環境變數${NC}"
    API_SUCCESS=false
fi

# 方法 3: 如果 API 失敗，提供 Dashboard 連結
if [ "$API_SUCCESS" = false ]; then
    echo -e "\n${BLUE}📋 方法 3: 使用 Dashboard 手動設置（推薦）${NC}"
    echo ""
    echo -e "${CYAN}由於無法自動設置，請在 Dashboard 中手動設置：${NC}"
    echo ""
    echo "🔗 直接連結："
    echo -e "${GREEN}https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions${NC}"
    echo ""
    echo "📋 操作步驟："
    echo "1. 打開上面的連結"
    echo "2. 點擊「Functions」選項卡"
    echo "3. 找到「Compatibility Flags」輸入框"
    echo "4. 輸入: ${CYAN}nodejs_compat${NC}"
    echo "5. 確保勾選 Production 和 Preview"
    echo "6. 點擊「Save」保存"
    echo "7. 前往「Deployments」頁面觸發新部署"
    echo ""
    
    # 不自動打開瀏覽器，只提供連結
    echo ""
    echo -e "${CYAN}請手動複製以下連結到瀏覽器中打開：${NC}"
    echo -e "${GREEN}https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions${NC}"
fi

# 總結
echo ""
echo "════════════════════════════════════════════════"
if [ "$API_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ 自動設置完成！${NC}"
    echo ""
    echo "下一步："
    echo "1. 等待 2-5 分鐘讓 Cloudflare Pages 重新部署"
    echo "2. 或手動觸發新部署："
    echo "   https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
    echo "3. 檢查網站是否正常："
    echo "   https://hua-sign-pri.pages.dev"
else
    echo -e "${YELLOW}⚠️  請在 Dashboard 中手動設置${NC}"
    echo ""
    echo "設置完成後，請告訴我，我可以幫您檢查網站是否正常。"
fi
echo "════════════════════════════════════════════════"
