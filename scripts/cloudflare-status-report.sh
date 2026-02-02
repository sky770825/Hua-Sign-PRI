#!/bin/bash

# Cloudflare Pages 完整狀態報告

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
SITE_URL="https://hua-sign-pri.pages.dev"

echo "════════════════════════════════════════════════"
echo "  Cloudflare Pages 完整狀態報告"
echo "  生成時間: $(date)"
echo "════════════════════════════════════════════════"
echo ""

# 1. 網站狀態
echo "【1】網站可訪問性"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 主網站可正常訪問 (HTTP $HTTP_CODE)"
    echo "   URL: $SITE_URL"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 主網站返回 404"
    echo "   URL: $SITE_URL"
    echo "   狀態: 需要部署或構建失敗"
else
    echo "⚠️  主網站狀態異常 (HTTP $HTTP_CODE)"
fi
echo ""

# 2. 專案狀態
echo "【2】專案狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v wrangler &> /dev/null; then
    if wrangler pages project list 2>/dev/null | grep -q "$PROJECT_NAME"; then
        PROJECT_INFO=$(wrangler pages project list 2>/dev/null | grep "$PROJECT_NAME")
        echo "✅ 專案存在"
        echo "   資訊: $PROJECT_INFO"
    else
        echo "❌ 專案不存在"
    fi
else
    echo "⚠️  無法檢查（wrangler 未安裝）"
fi
echo ""

# 3. 部署歷史
echo "【3】部署歷史"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v wrangler &> /dev/null; then
    DEPLOY_COUNT=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep -c "Production" || echo "0")
    if [ "$DEPLOY_COUNT" -gt "0" ]; then
        echo "✅ 有 $DEPLOY_COUNT 個生產環境部署"
        echo ""
        echo "最新 3 個部署："
        wrangler pages deployment list --project-name="$PROJECT_NAME" 2>/dev/null | grep "Production" | head -3 | while read line; do
            DEPLOY_ID=$(echo "$line" | awk '{print $1}')
            DEPLOY_TIME=$(echo "$line" | awk '{print $7, $8}')
            DEPLOY_URL=$(echo "$line" | awk '{print $6}')
            echo "  • 部署 ID: $DEPLOY_ID"
            echo "    時間: $DEPLOY_TIME"
            echo "    URL: $DEPLOY_URL"
            echo ""
        done
    else
        echo "❌ 沒有部署記錄"
    fi
else
    echo "⚠️  無法檢查（wrangler 未安裝）"
fi
echo ""

# 4. Git 狀態
echo "【4】Git 狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d ".git" ]; then
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
    LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "")
    
    if [ -n "$REMOTE_URL" ]; then
        echo "✅ Git 倉庫已配置"
        echo "   遠端: $REMOTE_URL"
        echo "   當前分支: $CURRENT_BRANCH"
        echo "   最新提交: $LAST_COMMIT"
    else
        echo "❌ 未配置遠端倉庫"
    fi
else
    echo "❌ 不是 Git 倉庫"
fi
echo ""

# 5. 診斷和建議
echo "【5】診斷和建議"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 網站無法訪問"
    echo ""
    echo "必須完成的步驟："
    echo ""
    echo "1️⃣  連接 Git 倉庫（如果尚未連接）"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
    echo "   點擊「連接 Git 倉庫」→ 選擇 GitHub → 選擇 sky770825/Hua-Sign-PRI (main)"
    echo ""
    echo "2️⃣  設置環境變數（必須）"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
    echo "   添加以下 3 個環境變數："
    echo "   • NEXT_PUBLIC_SUPABASE_URL"
    echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   • SUPABASE_SERVICE_KEY"
    echo "   （詳細值請查看 CLOUDFLARE_PAGES_FIX.md）"
    echo ""
    echo "3️⃣  檢查構建日誌"
    echo "   前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
    echo "   查看最新部署的構建日誌，確認是否有錯誤"
    echo ""
    echo "4️⃣  確認構建設置"
    echo "   構建命令: npm run build"
    echo "   構建輸出: .next"
    echo "   Node.js 版本: 18"
else
    echo "✅ 網站狀態正常"
fi
echo ""

# 6. 快速連結
echo "【6】快速連結"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Dashboard: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}"
echo "⚙️  環境變數: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo "🔨 構建設置: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/builds"
echo "📦 部署歷史: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
echo "🌐 網站 URL: $SITE_URL"
echo ""

echo "════════════════════════════════════════════════"
