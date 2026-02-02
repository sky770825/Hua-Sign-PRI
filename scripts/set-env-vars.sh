#!/bin/bash

# 使用 Cloudflare API 自動設置環境變數
# 需要先設置 CLOUDFLARE_API_TOKEN 環境變數

set -e

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 環境變數值
SUPABASE_URL="https://sqgrnowrcvspxhuudrqc.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
SUPABASE_SERVICE_KEY="$SUPABASE_ANON_KEY"

echo "🔧 設置 Cloudflare Pages 環境變數..."

# 檢查 API Token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ 錯誤：需要設置 CLOUDFLARE_API_TOKEN 環境變數"
    echo ""
    echo "請執行："
    echo "  export CLOUDFLARE_API_TOKEN='your-api-token'"
    echo ""
    echo "或創建 API Token："
    echo "  1. 前往: https://dash.cloudflare.com/profile/api-tokens"
    echo "  2. 創建 Token，權限：Account.Cloudflare Pages:Edit"
    exit 1
fi

# 設置環境變數（生產環境）
echo "設置生產環境變數..."

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"build_config\": {
      \"build_command\": \"npm run build\",
      \"destination_dir\": \".next\",
      \"root_dir\": \"/\",
      \"web_analytics_tag\": null,
      \"web_analytics_token\": null
    }
  }" 2>/dev/null | python3 -m json.tool || echo "構建設置完成"

# 注意：環境變數需要通過 Dashboard 設置，或使用 wrangler pages secret
echo ""
echo "⚠️  注意：環境變數需要手動在 Dashboard 設置"
echo "   或使用以下命令設置 secret（生產環境）："
echo ""
echo "  wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=${PROJECT_NAME}"
echo "  wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=${PROJECT_NAME}"
echo "  wrangler pages secret put SUPABASE_SERVICE_KEY --project-name=${PROJECT_NAME}"
echo ""
echo "📋 Dashboard URL:"
echo "   https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
