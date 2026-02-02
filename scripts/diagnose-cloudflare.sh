#!/bin/bash

# Cloudflare Pages 診斷腳本
# 檢查所有可能的問題

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
SITE_URL="https://hua-sign-pri.pages.dev"

echo "🔍 Cloudflare Pages 診斷報告"
echo "=========================================="
echo ""

# 1. 檢查網站可訪問性
echo "1. 網站可訪問性檢查"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
echo "   HTTP 狀態碼: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ 網站可正常訪問"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ 網站返回 404 - 需要部署"
else
    echo "   ⚠️  HTTP $HTTP_CODE"
fi
echo ""

# 2. 檢查專案是否存在
echo "2. 專案狀態檢查"
if command -v wrangler &> /dev/null; then
    if wrangler pages project list 2>/dev/null | grep -q "$PROJECT_NAME"; then
        echo "   ✅ 專案存在"
        PROJECT_INFO=$(wrangler pages project list 2>/dev/null | grep "$PROJECT_NAME")
        echo "   專案資訊: $PROJECT_INFO"
    else
        echo "   ❌ 專案不存在"
    fi
else
    echo "   ⚠️  wrangler 未安裝"
fi
echo ""

# 3. 檢查部署歷史
echo "3. 部署歷史檢查"
if command -v wrangler &> /dev/null; then
    DEPLOYMENTS=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | head -5)
    if [ -n "$DEPLOYMENTS" ]; then
        echo "   ✅ 有部署記錄"
        echo "$DEPLOYMENTS" | head -3
    else
        echo "   ❌ 沒有部署記錄 - 可能從未部署過"
    fi
else
    echo "   ⚠️  無法檢查（wrangler 未安裝）"
fi
echo ""

# 4. 檢查 Git 狀態
echo "4. Git 狀態檢查"
if [ -d ".git" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [ -n "$REMOTE_URL" ]; then
        echo "   ✅ Git 倉庫已配置"
        echo "   遠端: $REMOTE_URL"
        
        # 檢查是否有未推送的提交
        LOCAL_COMMITS=$(git log origin/main..HEAD 2>/dev/null | grep -c "^commit" || echo "0")
        if [ "$LOCAL_COMMITS" -gt "0" ]; then
            echo "   ⚠️  有 $LOCAL_COMMITS 個未推送的提交"
        else
            echo "   ✅ 代碼已同步"
        fi
    else
        echo "   ❌ 未配置遠端倉庫"
    fi
else
    echo "   ❌ 不是 Git 倉庫"
fi
echo ""

# 5. 診斷結果和建議
echo "=========================================="
echo "📋 診斷結果和建議"
echo "=========================================="
echo ""

if [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 網站無法訪問 (404)"
    echo ""
    echo "必須完成的步驟："
    echo ""
    echo "1. 連接 Git 倉庫"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
    echo "   點擊「連接 Git 倉庫」"
    echo "   選擇: sky770825/Hua-Sign-PRI (main 分支)"
    echo ""
    echo "2. 設置環境變數"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
    echo "   添加 3 個環境變數（詳見 CLOUDFLARE_PAGES_FIX.md）"
    echo ""
    echo "3. 觸發部署"
    echo "   完成上述步驟後，推送代碼或手動觸發部署"
    echo ""
else
    echo "✅ 網站狀態正常"
fi

echo ""
echo "📚 詳細指南: 查看 CLOUDFLARE_PAGES_FIX.md"
