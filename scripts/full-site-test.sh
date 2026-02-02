#!/bin/bash

# 完整網站功能測試腳本

set -e

SITE_URL="https://hua-sign-pri.pages.dev"
BASE_URL="${BASE_URL:-$SITE_URL}"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  完整網站功能測試${NC}"
echo -e "${BLUE}  測試目標: $BASE_URL${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo ""

# 測試函數
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "測試 $name... "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "$expected_status" ]; then
        echo -e "${GREEN}✅ 通過${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ 失敗${NC} (期望 HTTP $expected_status, 實際 HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

test_api_json() {
    local name=$1
    local url=$2
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "測試 $name... "
    
    RESPONSE=$(curl -s "$url" 2>/dev/null || echo "")
    
    if [ -z "$RESPONSE" ]; then
        echo -e "${RED}❌ 失敗${NC} (無響應)"
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    if echo "$RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 通過${NC} (有效的 JSON)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ 失敗${NC} (不是有效的 JSON)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. 基本可訪問性測試
echo -e "${BLUE}【1】基本可訪問性測試${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "主網站" "$BASE_URL" 200
echo ""

# 2. 前端頁面測試
echo -e "${BLUE}【2】前端頁面測試${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "簽到頁面" "$BASE_URL/checkin" 200
test_endpoint "幸運轉盤" "$BASE_URL/lottery" 200
test_endpoint "管理後台登入" "$BASE_URL/admin/login" 200
echo ""

# 3. API 端點測試
echo -e "${BLUE}【3】API 端點測試${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_api_json "會員 API" "$BASE_URL/api/members"
test_api_json "會議 API" "$BASE_URL/api/meetings"
test_api_json "簽到 API" "$BASE_URL/api/checkins"
test_api_json "獎品 API" "$BASE_URL/api/prizes"
test_api_json "統計 API" "$BASE_URL/api/statistics/member-attendance"
echo ""

# 4. 內容檢查
echo -e "${BLUE}【4】內容檢查${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((TOTAL + 1))
CONTENT=$(curl -s "$BASE_URL" 2>/dev/null || echo "")
if echo "$CONTENT" | grep -qi "next\|react\|html"; then
    echo -e "${GREEN}✅ 頁面包含有效內容${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 頁面內容異常${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. 響應時間測試
echo -e "${BLUE}【5】性能測試${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((TOTAL + 1))
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL" 2>/dev/null || echo "999")
if (( $(echo "$RESPONSE_TIME < 5.0" | bc -l 2>/dev/null || echo "1") )); then
    echo -e "${GREEN}✅ 響應時間正常 (${RESPONSE_TIME}秒)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  響應時間較慢 (${RESPONSE_TIME}秒)${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 總結
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  測試總結${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo "總測試數: $TOTAL"
echo -e "${GREEN}通過: $PASSED${NC}"
echo -e "${RED}失敗: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有測試通過！網站運行正常！${NC}"
    echo -e "${GREEN}🌐 網站 URL: $BASE_URL${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED 個測試失敗${NC}"
    echo ""
    echo "可能的原因："
    echo "1. 網站尚未部署完成"
    echo "2. 構建失敗"
    echo "3. 環境變數未設置"
    echo ""
    echo "請檢查："
    echo "- 構建日誌: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments"
    echo "- 環境變數: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables"
    exit 1
fi
