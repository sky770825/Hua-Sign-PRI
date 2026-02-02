#!/bin/bash

# 完整部署檢查腳本

PROJECT_NAME="hua-sign-pri"
SITE_URL="https://hua-sign-pri.pages.dev"

echo "════════════════════════════════════════════════"
echo "  完整部署檢查"
echo "════════════════════════════════════════════════"
echo ""

# 1. 檢查最新部署
echo "1. 最新部署狀態:"
LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>&1 | grep "Production" | head -1)

if [ -z "$LATEST_DEPLOY" ]; then
    echo "   ❌ 沒有找到部署記錄"
    exit 1
fi

DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
DEPLOY_STATUS=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $5}' | xargs)
DEPLOY_COMMIT=$(echo "$LATEST_DEPLOY" | awk '{print $4}')
DEPLOY_URL=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $5}' | xargs)

echo "   部署 ID: $DEPLOY_ID"
echo "   狀態: $DEPLOY_STATUS"
echo "   Git 提交: $DEPLOY_COMMIT"
echo "   部署 URL: $DEPLOY_URL"
echo ""

# 2. 檢查部署 URL
echo "2. 部署 URL 可訪問性:"
DEPLOY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>&1)
echo "   HTTP 狀態碼: $DEPLOY_HTTP"
if [ "$DEPLOY_HTTP" = "200" ]; then
    echo "   ✅ 部署 URL 可以訪問"
elif [ "$DEPLOY_HTTP" = "404" ]; then
    echo "   ⚠️  部署 URL 返回 404（構建可能失敗）"
else
    echo "   ❌ 部署 URL 無法訪問"
fi
echo ""

# 3. 檢查主網站
echo "3. 主網站可訪問性:"
MAIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>&1)
echo "   HTTP 狀態碼: $MAIN_HTTP"
if [ "$MAIN_HTTP" = "200" ]; then
    echo "   ✅ 主網站可以訪問"
    echo ""
    echo "════════════════════════════════════════════════"
    echo "  🎉 網站部署成功！"
    echo "════════════════════════════════════════════════"
    echo ""
    echo "🌐 網站 URL: $SITE_URL"
    exit 0
elif [ "$MAIN_HTTP" = "404" ]; then
    echo "   ⚠️  主網站返回 404"
else
    echo "   ❌ 主網站無法訪問"
fi
echo ""

# 4. 診斷建議
echo "4. 診斷建議:"
if [ "$DEPLOY_STATUS" = "Failure" ]; then
    echo "   ❌ 構建失敗"
    echo "   請檢查構建日誌:"
    echo "   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/$PROJECT_NAME/$DEPLOY_ID"
elif [ "$DEPLOY_STATUS" = "Active" ] && [ "$MAIN_HTTP" = "404" ]; then
    echo "   ⚠️  部署狀態為 Active，但網站返回 404"
    echo "   可能原因:"
    echo "   1. 構建輸出目錄配置不正確"
    echo "   2. 構建輸出目錄應該留空或設置為 '.next'"
    echo "   3. 需要等待 CDN 緩存更新（5-10 分鐘）"
    echo ""
    echo "   請檢查構建設置:"
    echo "   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/$PROJECT_NAME/settings/builds"
fi

echo ""
exit 1
