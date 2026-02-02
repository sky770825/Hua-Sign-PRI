#!/bin/bash

# 資料庫連接測試腳本

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "💾 資料庫連接測試"
echo "測試目標: $BASE_URL"
echo ""

test_db_table() {
    local name=$1
    local api_url=$2
    local table_key=$3
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "測試: $name"
    echo "API: $api_url"
    
    RESPONSE=$(curl -s "$api_url" 2>/dev/null || echo "")
    
    if [ -z "$RESPONSE" ]; then
        echo "狀態: ❌ 無響應"
        echo ""
        return 1
    fi
    
    if echo "$RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
        echo "格式: ✅ 有效的 JSON"
        
        # 檢查是否包含預期的 key
        if echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if '$table_key' in str(data) or 'success' in str(data):
        print('數據: ✅ 包含預期的數據')
        # 嘗試獲取數據數量
        if '$table_key' in data:
            count = len(data['$table_key']) if isinstance(data['$table_key'], list) else 'N/A'
            print(f'記錄數: {count}')
        elif 'data' in data and '$table_key' in data['data']:
            count = len(data['data']['$table_key']) if isinstance(data['data']['$table_key'], list) else 'N/A'
            print(f'記錄數: {count}')
        else:
            print('記錄數: N/A')
    else:
        print('數據: ⚠️  數據格式可能不正確')
except Exception as e:
    print(f'數據: ❌ 解析錯誤: {e}')
" 2>/dev/null; then
            echo ""
        else
            echo "數據: ⚠️  無法解析數據"
            echo ""
        fi
    else
        echo "格式: ❌ 不是有效的 JSON"
        echo "響應: $(echo "$RESPONSE" | head -5)"
        echo ""
        return 1
    fi
}

test_db_table "會員表 (estate_attendance_members)" "$BASE_URL/api/members" "members"
test_db_table "會議表 (estate_attendance_meetings)" "$BASE_URL/api/meetings" "meetings"
test_db_table "簽到表 (estate_attendance_checkins)" "$BASE_URL/api/checkins" "checkins"
test_db_table "獎品表 (estate_attendance_prizes)" "$BASE_URL/api/prizes" "prizes"
test_db_table "統計數據" "$BASE_URL/api/statistics/member-attendance" "memberStats"

echo "✅ 資料庫連接測試完成"
