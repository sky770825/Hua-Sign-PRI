#!/bin/bash

# 全面功能測試腳本
# 測試所有按鈕功能和 API 端點

set -e

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0
TOTAL=0

test_api() {
  local method=$1
  local endpoint=$2
  local description=$3
  local expected_status=${4:-200}
  local data=${5:-""}
  
  ((TOTAL++))
  echo "[$TOTAL] 📋 $description"
  echo "      $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
  elif [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
    if [ -n "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" 2>&1)
    fi
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo "      ✅ 通過 (HTTP $http_code)"
    ((PASSED++))
    return 0
  else
    echo "      ❌ 失敗 (HTTP $http_code, 預期 $expected_status)"
    if echo "$body" | grep -q "error"; then
      error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "      錯誤: $error_msg"
    fi
    ((FAILED++))
    return 1
  fi
}

echo "════════════════════════════════════════════════"
echo "  🧪 全面功能測試"
echo "════════════════════════════════════════════════"
echo ""

# 1. 獎品管理 API
echo "════════════════════════════════════════════════"
echo "  1️⃣  獎品管理 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/prizes" "查詢獎品列表"
echo ""

# 2. 會員管理 API
echo "════════════════════════════════════════════════"
echo "  2️⃣  會員管理 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/members" "查詢會員列表"
echo ""

# 3. 會議管理 API
echo "════════════════════════════════════════════════"
echo "  3️⃣  會議管理 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/meetings" "查詢會議列表"
echo ""

# 4. 簽到管理 API
echo "════════════════════════════════════════════════"
echo "  4️⃣  簽到管理 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/checkins" "查詢簽到記錄"
echo ""

# 5. 抽獎功能 API
echo "════════════════════════════════════════════════"
echo "  5️⃣  抽獎功能 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/lottery/winners" "查詢中獎記錄"
echo ""

# 6. 統計功能 API
echo "════════════════════════════════════════════════"
echo "  6️⃣  統計功能 API"
echo "════════════════════════════════════════════════"
test_api "GET" "/api/statistics/member-attendance" "查詢會員出席統計"
echo ""

echo ""
echo "════════════════════════════════════════════════"
echo "  📊 測試結果總結"
echo "════════════════════════════════════════════════"
echo ""
echo "總測試數: $TOTAL"
echo "✅ 通過: $PASSED"
echo "❌ 失敗: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 所有 API 測試通過！"
  exit 0
else
  echo "⚠️  有 $FAILED 個測試失敗，請檢查上述錯誤"
  exit 1
fi
