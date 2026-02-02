#!/bin/bash

# GitHub 和 Cloudflare Pages 連接診斷腳本

PROJECT_NAME="hua-sign-pri"
REPO_NAME="sky770825/Hua-Sign-PRI"
SITE_URL="https://hua-sign-pri.pages.dev"

echo "════════════════════════════════════════════════"
echo "  GitHub 和 Cloudflare Pages 連接診斷"
echo "════════════════════════════════════════════════"
echo ""

# 1. 檢查本地 Git 狀態
echo "1. 本地 Git 狀態:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$(dirname "$0")/.."

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "未設置")
echo "   遠程倉庫: $REMOTE_URL"

if [ "$REMOTE_URL" != "未設置" ]; then
    if echo "$REMOTE_URL" | grep -q "github.com"; then
        echo "   ✅ 已連接到 GitHub"
    else
        echo "   ⚠️  遠程倉庫不是 GitHub"
    fi
fi

echo ""
echo "   最新提交:"
git log --oneline -3 | sed 's/^/   /'

echo ""
echo "   未推送的提交:"
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null)
if [ -z "$UNPUSHED" ]; then
    echo "   ✅ 沒有未推送的提交"
else
    echo "   ⚠️  有未推送的提交:"
    echo "$UNPUSHED" | sed 's/^/   /'
fi

echo ""
echo "   未提交的更改:"
if [ -z "$(git status --porcelain)" ]; then
    echo "   ✅ 沒有未提交的更改"
else
    echo "   ⚠️  有未提交的更改:"
    git status --short | sed 's/^/   /'
fi

echo ""

# 2. 檢查 GitHub 連接
echo "2. GitHub 連接狀態:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
GITHUB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://api.github.com/repos/$REPO_NAME" 2>&1)
if [ "$GITHUB_STATUS" = "200" ]; then
    echo "   ✅ GitHub 倉庫可訪問"
    REPO_INFO=$(curl -s "https://api.github.com/repos/$REPO_NAME")
    DEFAULT_BRANCH=$(echo "$REPO_INFO" | grep -o '"default_branch":"[^"]*"' | cut -d'"' -f4)
    echo "   默認分支: $DEFAULT_BRANCH"
else
    echo "   ❌ GitHub 倉庫無法訪問 (HTTP $GITHUB_STATUS)"
fi

echo ""

# 3. 檢查 Cloudflare Pages 部署
echo "3. Cloudflare Pages 部署狀態:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LATEST_DEPLOY=$(wrangler pages deployment list --project-name="$PROJECT_NAME" 2>&1 | grep "Production" | head -1)

if [ -z "$LATEST_DEPLOY" ]; then
    echo "   ❌ 沒有找到部署記錄"
else
    DEPLOY_STATUS=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $6}' | xargs)
    DEPLOY_COMMIT=$(echo "$LATEST_DEPLOY" | awk '{print $4}')
    DEPLOY_TIME=$(echo "$LATEST_DEPLOY" | awk -F'│' '{print $7}' | xargs)
    
    echo "   最新部署狀態: $DEPLOY_STATUS"
    echo "   Git 提交: $DEPLOY_COMMIT"
    echo "   部署時間: $DEPLOY_TIME"
    
    # 檢查本地是否有這個提交
    if git rev-parse --verify "$DEPLOY_COMMIT" >/dev/null 2>&1; then
        echo "   ✅ 本地有這個提交"
    else
        echo "   ⚠️  本地沒有這個提交（可能需要 git pull）"
    fi
fi

echo ""

# 4. 檢查網站可訪問性
echo "4. 網站可訪問性:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MAIN_HTTP=$(curl -sL -o /dev/null -w "%{http_code}" "$SITE_URL" 2>&1)
echo "   主網站 ($SITE_URL): HTTP $MAIN_HTTP"

if [ "$MAIN_HTTP" = "200" ]; then
    echo "   ✅ 主網站可以訪問"
    CONTENT=$(curl -sL "$SITE_URL" | head -20)
    if echo "$CONTENT" | grep -q "Cloudflare Access\|Sign in"; then
        echo "   ⚠️  網站顯示 Cloudflare Access 登入頁面（可能需要配置）"
    elif echo "$CONTENT" | grep -q "<!DOCTYPE html>"; then
        echo "   ✅ 網站返回正常 HTML"
    fi
elif [ "$MAIN_HTTP" = "404" ]; then
    echo "   ❌ 主網站返回 404"
    echo "   可能原因:"
    echo "   - 構建輸出目錄配置不正確"
    echo "   - 構建失敗但狀態顯示 Active"
    echo "   - CDN 緩存未更新"
else
    echo "   ❌ 主網站無法訪問 (HTTP $MAIN_HTTP)"
fi

echo ""

# 5. 診斷建議
echo "5. 診斷建議:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$GITHUB_STATUS" != "200" ]; then
    echo "   ❌ GitHub 連接有問題"
    echo "   建議: 檢查 GitHub 倉庫是否公開或需要授權"
fi

if [ -n "$UNPUSHED" ]; then
    echo "   ⚠️  有未推送的提交"
    echo "   建議: 執行 git push origin main"
fi

if [ "$MAIN_HTTP" = "404" ]; then
    echo "   ⚠️  網站返回 404"
    echo "   建議:"
    echo "   1. 檢查構建日誌: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/$PROJECT_NAME/deployments"
    echo "   2. 檢查構建設置: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/$PROJECT_NAME/settings/builds"
    echo "   3. 確認構建輸出目錄設置正確（留空或 .next）"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  診斷完成"
echo "════════════════════════════════════════════════"
