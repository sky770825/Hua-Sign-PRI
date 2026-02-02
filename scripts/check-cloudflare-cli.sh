#!/bin/bash

# Cloudflare CLI 設定檢查腳本

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Cloudflare CLI 設定檢查${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 1. 檢查 Wrangler 是否已安裝
echo -e "${BLUE}【1】檢查 Wrangler 安裝狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npx wrangler --version 2>&1 | grep -q "wrangler"; then
    VERSION=$(npx wrangler --version 2>&1 | head -1)
    echo -e "${GREEN}✅ Wrangler 已安裝${NC}"
    echo "   版本: $VERSION"
else
    echo -e "${RED}✗ Wrangler 未安裝${NC}"
    echo "   建議: npm install -g wrangler"
fi
echo ""

# 2. 檢查是否已登入
echo -e "${BLUE}【2】檢查 Cloudflare 登入狀態${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
WHOAMI_OUTPUT=$(npx wrangler whoami 2>&1)
if echo "$WHOAMI_OUTPUT" | grep -q "logged in\|Account ID"; then
    echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"
    echo "$WHOAMI_OUTPUT" | grep -E "Account ID|email" | head -3
else
    echo -e "${RED}✗ 未登入 Cloudflare${NC}"
    echo "   建議: npx wrangler login"
fi
echo ""

# 3. 檢查 Cloudflare API Token
echo -e "${BLUE}【3】檢查 Cloudflare API Token${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    TOKEN_PREVIEW=$(echo "$CLOUDFLARE_API_TOKEN" | head -c 10)
    echo -e "${GREEN}✅ CLOUDFLARE_API_TOKEN 已設定${NC}"
    echo "   預覽: ${TOKEN_PREVIEW}..."
else
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN 未設定${NC}"
    echo "   說明: 可選，用於 API 自動化操作"
    echo "   設定: export CLOUDFLARE_API_TOKEN='your-token'"
fi
echo ""

# 4. 檢查 Cloudflare Account ID
echo -e "${BLUE}【4】檢查 Cloudflare Account ID${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -n "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo -e "${GREEN}✅ CLOUDFLARE_ACCOUNT_ID 已設定${NC}"
    echo "   Account ID: $CLOUDFLARE_ACCOUNT_ID"
else
    echo -e "${YELLOW}⚠️  CLOUDFLARE_ACCOUNT_ID 未設定${NC}"
    echo "   說明: 可選，用於 API 自動化操作"
    echo "   當前已知: 82ebeb1d91888e83e8e1b30eeb33d3c3"
    echo "   設定: export CLOUDFLARE_ACCOUNT_ID='82ebeb1d91888e83e8e1b30eeb33d3c3'"
fi
echo ""

# 5. 檢查 Pages 專案
echo -e "${BLUE}【5】檢查 Cloudflare Pages 專案${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PROJECT_LIST=$(npx wrangler pages project list 2>&1)
if echo "$PROJECT_LIST" | grep -q "hua-sign-pri\|Project"; then
    echo -e "${GREEN}✅ 可以列出專案${NC}"
    echo "$PROJECT_LIST" | grep -A 5 "hua-sign-pri" | head -5
else
    if echo "$PROJECT_LIST" | grep -qi "not logged\|unauthorized\|error"; then
        echo -e "${RED}✗ 無法列出專案（需要登入）${NC}"
        echo "   建議: npx wrangler login"
    else
        echo -e "${YELLOW}⚠️  無法列出專案或專案不存在${NC}"
        echo "   輸出: $PROJECT_LIST"
    fi
fi
echo ""

# 總結
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  檢查總結${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"

# 檢查關鍵項目
WRANGLER_OK=$(npx wrangler --version 2>&1 | grep -q "wrangler" && echo "yes" || echo "no")
LOGIN_OK=$(npx wrangler whoami 2>&1 | grep -q "logged in\|Account ID" && echo "yes" || echo "no")
PROJECT_OK=$(npx wrangler pages project list 2>&1 | grep -q "hua-sign-pri" && echo "yes" || echo "no")

if [ "$WRANGLER_OK" = "yes" ] && [ "$LOGIN_OK" = "yes" ] && [ "$PROJECT_OK" = "yes" ]; then
    echo -e "${GREEN}✅ Cloudflare CLI 設定完整${NC}"
    echo "   所有關鍵項目都已配置"
else
    echo -e "${YELLOW}⚠️  部分設定需要完成${NC}"
    if [ "$WRANGLER_OK" = "no" ]; then
        echo "   - 需要安裝 Wrangler"
    fi
    if [ "$LOGIN_OK" = "no" ]; then
        echo "   - 需要登入 Cloudflare"
    fi
    if [ "$PROJECT_OK" = "no" ]; then
        echo "   - 無法訪問專案（可能需要登入）"
    fi
fi

echo ""
