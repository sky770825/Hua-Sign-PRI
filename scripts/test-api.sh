#!/bin/bash

# API 端點詳細測試腳本

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🔌 API 端點詳細測試"
echo "測試目標: $BASE_URL"
echo ""

test_api() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "測試: $name"
    echo "方法: $method"
    echo "URL: $url"
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$url" 2>/dev/null || echo "ERROR")
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d "$data" -w "\nHTTP_CODE:%{http_code}" "$url" 2>/dev/null || echo "ERROR")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')
    
    echo "HTTP 狀態碼: $HTTP_CODE"
    
    if echo "$BODY" | python3 -m json.tool > /dev/null 2>&1; then
        echo "響應格式: ✅ 有效的 JSON"
        echo "響應內容:"
        echo "$BODY" | python3 -m json.tool | head -20
    else
        echo "響應格式: ❌ 不是有效的 JSON"
        echo "響應內容:"
        echo "$BODY" | head -10
    fi
    
    echo ""
}

# GET 請求測試
test_api "獲取所有會員" "GET" "$BASE_URL/api/members"
test_api "獲取所有會議" "GET" "$BASE_URL/api/meetings"
test_api "獲取所有簽到記錄" "GET" "$BASE_URL/api/checkins"
test_api "獲取所有獎品" "GET" "$BASE_URL/api/prizes"
test_api "獲取會員出席統計" "GET" "$BASE_URL/api/statistics/member-attendance"
test_api "獲取抽獎獲勝者" "GET" "$BASE_URL/api/lottery/winners"
test_api "檢查匯入狀態" "GET" "$BASE_URL/api/statistics/check"

echo "✅ API 測試完成"
