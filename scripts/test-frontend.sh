#!/bin/bash

# 前端頁面測試腳本

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🌐 前端頁面測試"
echo "測試目標: $BASE_URL"
echo ""

test_page() {
    local name=$1
    local url=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "測試: $name"
    echo "URL: $url"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    CONTENT=$(curl -s "$url" 2>/dev/null | head -50)
    
    echo "HTTP 狀態碼: $HTTP_CODE"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "狀態: ✅ 頁面可訪問"
        
        # 檢查是否包含 Next.js 標記
        if echo "$CONTENT" | grep -q "next"; then
            echo "框架: ✅ Next.js 頁面"
        fi
        
        # 檢查是否有錯誤
        if echo "$CONTENT" | grep -qi "error\|錯誤"; then
            echo "警告: ⚠️  頁面可能包含錯誤訊息"
        fi
        
        # 檢查關鍵元素
        if echo "$CONTENT" | grep -q "DOCTYPE"; then
            echo "格式: ✅ 有效的 HTML"
        fi
    else
        echo "狀態: ❌ 頁面無法訪問 (HTTP $HTTP_CODE)"
    fi
    
    echo ""
}

test_page "主頁" "$BASE_URL"
test_page "簽到頁面" "$BASE_URL/checkin"
test_page "幸運轉盤" "$BASE_URL/lottery"
test_page "管理後台登入" "$BASE_URL/admin/login"
test_page "管理後台" "$BASE_URL/admin/attendance_management"

echo "✅ 前端頁面測試完成"
