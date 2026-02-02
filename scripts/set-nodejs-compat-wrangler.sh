#!/bin/bash

# 使用 wrangler CLI 設置 nodejs_compat Compatibility Flag

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

echo "════════════════════════════════════════════════"
echo "  使用 wrangler 設置 nodejs_compat"
echo "════════════════════════════════════════════════"
echo ""

# 檢查 wrangler 是否登入
if ! wrangler whoami >/dev/null 2>&1; then
    echo "❌ 錯誤: wrangler 未登入"
    echo ""
    echo "請先登入:"
    echo "  wrangler login"
    exit 1
fi

echo "✅ wrangler 已登入"
echo ""

# 注意：wrangler pages 可能不直接支持設置 compatibility flags
# 但我們可以嘗試使用 API（wrangler 會自動處理認證）
echo "⚠️  注意：wrangler pages 可能不直接支持設置 compatibility flags"
echo ""
echo "建議使用 Dashboard 手動設置："
echo "https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions"
echo ""
echo "或使用 Cloudflare API（需要 API Token）："
echo ""
echo "1. 獲取 API Token: https://dash.cloudflare.com/profile/api-tokens"
echo "2. 設置環境變數: export CLOUDFLARE_API_TOKEN='your-token'"
echo "3. 執行: bash scripts/set-nodejs-compat.sh"
echo ""
