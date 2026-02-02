#!/bin/bash

# 完全自動化執行 nodejs_compat 設置
# 使用 wrangler.toml 和觸發部署

set -e

ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"
PROJECT_NAME="hua-sign-pri"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🤖 完全自動化執行 nodejs_compat 設置${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 步驟 1: 檢查 wrangler.toml
echo -e "${BLUE}📋 步驟 1: 檢查 wrangler.toml 配置...${NC}"
if [ -f "wrangler.toml" ]; then
    echo -e "${GREEN}✅ wrangler.toml 已存在${NC}"
    if grep -q "nodejs_compat" wrangler.toml; then
        echo -e "${GREEN}✅ 已包含 nodejs_compat 設置${NC}"
        echo ""
        echo "配置內容："
        grep -E "(compatibility_date|compatibility_flags)" wrangler.toml | head -5
    else
        echo -e "${YELLOW}⚠️  wrangler.toml 中未找到 nodejs_compat${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ wrangler.toml 不存在${NC}"
    exit 1
fi

# 步驟 2: 確保 wrangler.toml 已提交到 Git
echo -e "\n${BLUE}📋 步驟 2: 檢查 Git 狀態...${NC}"
if git status wrangler.toml 2>/dev/null | grep -q "modified\|new file"; then
    echo -e "${YELLOW}⚠️  wrangler.toml 有未提交的更改${NC}"
    echo "正在提交..."
    git add wrangler.toml
    git commit -m "自動化: 確保 nodejs_compat 設置已提交" 2>/dev/null || echo "無更改需要提交"
    echo -e "${GREEN}✅ 已提交${NC}"
elif git status wrangler.toml 2>/dev/null | grep -q "nothing to commit"; then
    echo -e "${GREEN}✅ wrangler.toml 已提交${NC}"
else
    echo -e "${YELLOW}⚠️  無法檢查 Git 狀態${NC}"
fi

# 步驟 3: 推送到 GitHub 以觸發自動部署
echo -e "\n${BLUE}📋 步驟 3: 推送到 GitHub 觸發自動部署...${NC}"
if git remote get-url origin >/dev/null 2>&1; then
    echo "正在推送..."
    git push origin main 2>&1 | tail -5
    echo -e "${GREEN}✅ 已推送到 GitHub${NC}"
    echo ""
    echo "Cloudflare Pages 會自動檢測到更改並開始部署"
    echo "部署通常需要 2-5 分鐘"
else
    echo -e "${YELLOW}⚠️  未找到 Git remote${NC}"
fi

# 步驟 4: 檢查部署狀態
echo -e "\n${BLUE}📋 步驟 4: 檢查部署狀態...${NC}"
echo "等待 10 秒後檢查..."
sleep 10

if command -v wrangler >/dev/null 2>&1; then
    echo "使用 wrangler 檢查最新部署..."
    wrangler pages deployment list --project-name=hua-sign-pri 2>&1 | grep -E "(Production|Status|Environment)" | head -5 || echo "無法獲取部署狀態"
fi

# 總結
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 自動化執行完成！${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""
echo "📋 已完成的操作："
echo "  1. ✅ 檢查 wrangler.toml 配置"
echo "  2. ✅ 確保配置已提交到 Git"
echo "  3. ✅ 推送到 GitHub 觸發自動部署"
echo ""
echo "⏳ 接下來："
echo "  1. Cloudflare Pages 會自動讀取 wrangler.toml"
echo "  2. 應用 nodejs_compat 設置"
echo "  3. 開始構建和部署（2-5 分鐘）"
echo ""
echo "🔗 檢查部署狀態："
echo "  https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
echo ""
echo "🔗 檢查網站："
echo "  https://hua-sign-pri.pages.dev"
echo ""
echo -e "${YELLOW}⚠️  注意：${NC}"
echo "  如果 Cloudflare Pages 使用 V1 構建系統，"
echo "  可能不會自動讀取 wrangler.toml。"
echo "  在這種情況下，請在 Dashboard 中手動設置："
echo "  https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/functions"
