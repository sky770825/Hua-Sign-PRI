#!/bin/bash

# 驗證構建設置是否正確

PROJECT_NAME="hua-sign-pri"
ACCOUNT_ID="82ebeb1d91888e83e8e1b30eeb33d3c3"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  構建設置驗證檢查清單${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}請確認您已在 Cloudflare Pages Dashboard 完成以下設置：${NC}"
echo ""

echo -e "${BLUE}【1】構建設置（必須）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/builds"
echo ""
echo "必須設置："
echo "  ✅ 構建命令: npm run build"
echo "  ✅ 構建輸出目錄: 留空或 .next"
echo "  ✅ Node.js 版本: 18"
echo "  ✅ 根目錄: / (留空)"
echo ""

echo -e "${BLUE}【2】環境變數設置（必須）${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/settings/environment-variables"
echo ""
echo "必須添加以下 3 個環境變數（生產和預覽環境都要設置）："
echo ""
echo "  1. NEXT_PUBLIC_SUPABASE_URL"
echo "     值: https://sqgrnowrcvspxhuudrqc.supabase.co"
echo ""
echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo ""
echo "  3. SUPABASE_SERVICE_KEY"
echo "     值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw"
echo ""

echo -e "${BLUE}【3】觸發新部署${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "完成上述設置後，有兩種方式觸發部署："
echo ""
echo "  方式 1: 在 Dashboard 中手動觸發「重新部署」"
echo "  前往: https://dash.cloudflare.com/${ACCOUNT_ID}/pages/view/${PROJECT_NAME}/deployments"
echo ""
echo "  方式 2: 推送新代碼觸發自動部署"
echo "  執行: git commit --allow-empty -m '觸發部署' && git push origin main"
echo ""

echo -e "${BLUE}【4】等待並驗證${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "部署觸發後，等待 2-5 分鐘讓構建完成"
echo ""
echo "然後執行檢查："
echo "  npm run check:cloudflare"
echo ""

echo -e "${YELLOW}⚠️  重要提醒：${NC}"
echo "如果構建命令未設置，構建日誌會顯示："
echo "  'No build command specified. Skipping build step.'"
echo ""
echo "這會導致網站無法訪問（404 錯誤）"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
