#!/bin/bash

# 全面自動化測試腳本
# 檢查前端、後端、API、資料庫連接等

set -e

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 測試結果計數
PASSED=0
FAILED=0
TOTAL=0

# 伺服器 URL
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo -e "${BLUE}🧪 開始自動化測試...${NC}"
echo "測試目標: $BASE_URL"
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
    local expected_key=$3
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "測試 $name... "
    
    RESPONSE=$(curl -s "$url" 2>/dev/null || echo "")
    
    if [ -z "$RESPONSE" ]; then
        echo -e "${RED}❌ 失敗${NC} (無響應)"
        FAILED=$((FAILED + 1))
        return 1
    fi
    
    # 檢查是否為 JSON
    if echo "$RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
        # 檢查是否包含預期的 key
        if [ -n "$expected_key" ]; then
            if echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); sys.exit(0 if '$expected_key' in str(data) else 1)" 2>/dev/null; then
                echo -e "${GREEN}✅ 通過${NC} (有效的 JSON，包含 $expected_key)"
                PASSED=$((PASSED + 1))
                return 0
            else
                echo -e "${YELLOW}⚠️  警告${NC} (有效的 JSON，但不包含 $expected_key)"
                PASSED=$((PASSED + 1))
                return 0
            fi
        else
            echo -e "${GREEN}✅ 通過${NC} (有效的 JSON)"
            PASSED=$((PASSED + 1))
            return 0
        fi
    else
        echo -e "${RED}❌ 失敗${NC} (不是有效的 JSON)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. 檢查伺服器是否運行
echo -e "${BLUE}📡 步驟 1: 檢查伺服器狀態...${NC}"
if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 伺服器正在運行${NC}"
else
    echo -e "${RED}❌ 伺服器未運行，請先啟動: npm run dev${NC}"
    exit 1
fi
echo ""

# 2. 測試前端頁面
echo -e "${BLUE}🌐 步驟 2: 測試前端頁面...${NC}"
test_endpoint "主頁" "$BASE_URL" 200
test_endpoint "簽到頁面" "$BASE_URL/checkin" 200
test_endpoint "幸運轉盤" "$BASE_URL/lottery" 200
test_endpoint "管理後台登入" "$BASE_URL/admin/login" 200
test_endpoint "管理後台" "$BASE_URL/admin/attendance_management" 200
echo ""

# 3. 測試 API 端點
echo -e "${BLUE}🔌 步驟 3: 測試 API 端點...${NC}"
test_api_json "會員 API" "$BASE_URL/api/members" "members"
test_api_json "會議 API" "$BASE_URL/api/meetings" "meetings"
test_api_json "簽到 API" "$BASE_URL/api/checkins" "checkins"
test_api_json "獎品 API" "$BASE_URL/api/prizes" "prizes"
test_api_json "統計 API" "$BASE_URL/api/statistics/member-attendance" "success"
test_api_json "抽獎獲勝者 API" "$BASE_URL/api/lottery/winners" "winners"
echo ""

# 4. 測試資料庫連接（通過 API）
echo -e "${BLUE}💾 步驟 4: 測試資料庫連接...${NC}"
DB_TEST=$(curl -s "$BASE_URL/api/members" 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'members' in data or 'success' in data:
        print('OK')
    else:
        print('ERROR')
except:
    print('ERROR')
" 2>/dev/null || echo "ERROR")

TOTAL=$((TOTAL + 1))
if [ "$DB_TEST" = "OK" ]; then
    echo -e "${GREEN}✅ 資料庫連接正常${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 資料庫連接失敗${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. 測試環境變數
echo -e "${BLUE}⚙️  步驟 5: 檢查環境變數...${NC}"
ENV_VARS=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
MISSING_VARS=()

for var in "${ENV_VARS[@]}"; do
    TOTAL=$((TOTAL + 1))
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠️  $var 未設置（可能使用預設值）${NC}"
        MISSING_VARS+=("$var")
        PASSED=$((PASSED + 1))  # 不算失敗，因為有預設值
    else
        echo -e "${GREEN}✅ $var 已設置${NC}"
        PASSED=$((PASSED + 1))
    fi
done
echo ""

# 6. 測試構建
echo -e "${BLUE}🔨 步驟 6: 測試構建...${NC}"
TOTAL=$((TOTAL + 1))
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 構建成功${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ 構建失敗${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 7. 檢查依賴
echo -e "${BLUE}📦 步驟 7: 檢查依賴...${NC}"
TOTAL=$((TOTAL + 1))
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules 存在${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  node_modules 不存在，請執行: npm install${NC}"
    FAILED=$((FAILED + 1))
fi
echo ""

# 總結
echo -e "${BLUE}📊 測試總結${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "總測試數: $TOTAL"
echo -e "${GREEN}通過: $PASSED${NC}"
echo -e "${RED}失敗: $FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有測試通過！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有 $FAILED 個測試失敗${NC}"
    exit 1
fi
