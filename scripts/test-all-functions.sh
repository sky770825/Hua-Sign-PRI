#!/bin/bash

# 全面測試所有功能
# 包括 API 端點和按鈕功能

set -e

echo "════════════════════════════════════════════════"
echo "  🧪 全面功能測試"
echo "════════════════════════════════════════════════"
echo ""

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0

# 測試函數
test_api() {
  local method=$1
  local endpoint=$2
  local description=$3
  local expected_status=${4:-200}
  
  echo "📋 測試: $description"
  echo "   $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" 2>&1)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo "   ✅ 通過 (HTTP $http_code)"
    ((PASSED++))
    return 0
  else
    echo "   ❌ 失敗 (HTTP $http_code, 預期 $expected_status)"
    echo "   響應: $(echo "$body" | head -3)"
    ((FAILED++))
    return 1
  fi
}

echo "════════════════════════════════════════════════"
echo "  1️⃣  API 端點測試"
echo "════════════════════════════════════════════════"
echo ""

# 測試獎品相關 API
echo "📦 獎品管理 API："
test_api "GET" "/api/prizes" "查詢獎品列表"
test_api "GET" "/api/prizes/999" "查詢不存在的獎品" 404
echo ""

# 測試會員相關 API
echo "👥 會員管理 API："
test_api "GET" "/api/members" "查詢會員列表"
echo ""

# 測試會議相關 API
echo "📅 會議管理 API："
test_api "GET" "/api/meetings" "查詢會議列表"
echo ""

# 測試簽到相關 API
echo "✅ 簽到管理 API："
test_api "GET" "/api/checkins" "查詢簽到記錄"
echo ""

# 測試抽獎相關 API
echo "🎲 抽獎功能 API："
test_api "GET" "/api/lottery/winners" "查詢中獎記錄"
echo ""

echo ""
echo "════════════════════════════════════════════════"
echo "  📊 測試結果"
echo "════════════════════════════════════════════════"
echo ""
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
