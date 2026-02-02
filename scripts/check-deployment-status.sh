#!/bin/bash

# 檢查 Cloudflare Pages 部署狀態

PROJECT_NAME="hua-sign-pri"
SITE_URL="https://hua-sign-pri.pages.dev"

echo "📊 Cloudflare Pages 部署狀態檢查"
echo "=========================================="
echo ""

# 獲取最新部署
echo "最新部署資訊："
LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -1)

if [ -n "$LATEST_DEPLOY" ]; then
    echo "$LATEST_DEPLOY"
    echo ""
    
    # 提取部署 ID
    DEPLOY_ID=$(echo "$LATEST_DEPLOY" | awk '{print $1}')
    DEPLOY_URL=$(echo "$LATEST_DEPLOY" | awk '{print $6}')
    
    echo "部署 ID: $DEPLOY_ID"
    echo "部署 URL: $DEPLOY_URL"
    echo ""
    
    # 檢查部署 URL 是否可訪問
    echo "檢查部署 URL..."
    DEPLOY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL" 2>/dev/null || echo "000")
    if [ "$DEPLOY_HTTP" = "200" ]; then
        echo "✅ 部署 URL 可訪問 (HTTP $DEPLOY_HTTP)"
    else
        echo "❌ 部署 URL 無法訪問 (HTTP $DEPLOY_HTTP)"
    fi
    echo ""
    
    # 檢查主網站
    echo "檢查主網站..."
    MAIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
    if [ "$MAIN_HTTP" = "200" ]; then
        echo "✅ 主網站可訪問 (HTTP $MAIN_HTTP)"
    else
        echo "❌ 主網站無法訪問 (HTTP $MAIN_HTTP)"
        echo ""
        echo "可能的原因："
        echo "1. 部署未設置為生產環境"
        echo "2. 構建失敗"
        echo "3. 環境變數未設置"
        echo ""
        echo "請檢查構建日誌："
        echo "https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/$PROJECT_NAME/$DEPLOY_ID"
    fi
else
    echo "❌ 沒有找到部署記錄"
fi

echo ""
echo "=========================================="
