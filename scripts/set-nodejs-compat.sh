#!/bin/bash

# 使用 Cloudflare API 設置 nodejs_compat Compatibility Flag

ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
PROJECT_NAME="hua-sign-pri"

echo "════════════════════════════════════════════════"
echo "  設置 nodejs_compat Compatibility Flag"
echo "════════════════════════════════════════════════"
echo ""

# 檢查 API Token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ 錯誤: 未設置 CLOUDFLARE_API_TOKEN"
    echo ""
    echo "請設置環境變數:"
    echo "  export CLOUDFLARE_API_TOKEN='your-api-token'"
    echo ""
    echo "或使用 wrangler 登入後，API Token 會自動使用"
    exit 1
fi

echo "正在設置 Compatibility Flags..."
echo ""

# 使用 API 設置
RESPONSE=$(curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "compatibility_flags": ["nodejs_compat"]
      },
      "preview": {
        "compatibility_flags": ["nodejs_compat"]
      }
    }
  }')

# 檢查響應
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ 成功設置 nodejs_compat Compatibility Flag！"
    echo ""
    echo "已設置給："
    echo "  - Production（生產環境）"
    echo "  - Preview（預覽環境）"
    echo ""
    echo "⚠️  請在 Dashboard 中觸發新部署，設置才會生效"
    echo ""
    echo "前往部署頁面："
    echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
else
    echo "❌ 設置失敗"
    echo ""
    echo "響應："
    echo "$RESPONSE" | head -20
    echo ""
    echo "請檢查："
    echo "1. API Token 是否正確"
    echo "2. 專案名稱是否正確"
    echo "3. 或手動在 Dashboard 中設置"
fi
