#!/bin/bash

# 快速專案套餐檢查（非互動模式）

echo "🎯 專案套餐快速檢查"
echo "════════════════════════════════════════════════"
echo ""

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查 CLI 工具
check_tool() {
    local name=$1
    local check_cmd=$2
    local required=${3:-false}
    
    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${name} 已安裝${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ ${name} 未安裝 (必需)${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  ${name} 未安裝 (可選)${NC}"
            return 0
        fi
    fi
}

echo -e "${BLUE}【1】檢查 CLI 工具狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_MISSING=0

check_tool "Node.js" "node --version" true || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
check_tool "npm" "npm --version" true || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
check_tool "Git" "git --version" true || REQUIRED_MISSING=$((REQUIRED_MISSING + 1))
check_tool "Supabase CLI" "npx supabase --version" true
check_tool "GitHub CLI" "gh --version" false
check_tool "Cloudflare CLI (Wrangler)" "npx wrangler --version" false

echo ""

echo -e "${BLUE}【2】檢查登入狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Supabase
if npx supabase projects list > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase 已登入${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase 未登入${NC}"
fi

# GitHub
if gh auth status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GitHub 已登入${NC}"
else
    echo -e "${YELLOW}ℹ️  GitHub 未登入 (可選)${NC}"
fi

# Cloudflare
if npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Cloudflare 已登入${NC}"
else
    echo -e "${YELLOW}ℹ️  Cloudflare 未登入 (可選)${NC}"
fi

echo ""

echo -e "${BLUE}【3】檢查專案狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 檢查 package.json
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ package.json 存在${NC}"
else
    echo -e "${RED}❌ package.json 不存在${NC}"
fi

# 檢查 node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules 存在${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules 不存在，請執行: npm install${NC}"
fi

# 檢查 .env.local
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local 存在${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local 不存在${NC}"
fi

echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  檢查總結${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

if [ $REQUIRED_MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ 所有必需的 CLI 工具已安裝${NC}"
else
    echo -e "${RED}❌ 有 $REQUIRED_MISSING 個必需的 CLI 工具未安裝${NC}"
fi

echo ""
echo "📋 下一步建議:"
echo "  1. 執行完整套餐: npm run bundle"
echo "  2. 自動安裝模式: npm run bundle:auto"
echo "  3. 只檢查狀態: npm run bundle:check"
echo ""
