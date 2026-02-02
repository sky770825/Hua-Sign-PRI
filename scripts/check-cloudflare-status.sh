#!/bin/bash

# 快速檢查 Cloudflare Pages 狀態

SITE_URL="https://hua-sign-pri.pages.dev"

echo "🔍 檢查 Cloudflare Pages 狀態..."
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 網站可正常訪問！"
    echo "🌐 $SITE_URL"
    exit 0
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 網站返回 404 - 需要部署"
    echo ""
    echo "可能的原因："
    echo "1. Git 倉庫未連接"
    echo "2. 環境變數未設置"
    echo "3. 構建失敗"
    echo ""
    echo "請執行: npm run fix:cloudflare"
    exit 1
else
    echo "⚠️  HTTP $HTTP_CODE"
    echo "請檢查 Dashboard 或執行: npm run fix:cloudflare"
    exit 1
fi
