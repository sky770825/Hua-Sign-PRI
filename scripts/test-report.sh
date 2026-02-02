#!/bin/bash

# 生成詳細測試報告

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"

echo "📊 生成詳細測試報告..."
echo "報告將保存到: $REPORT_FILE"
echo ""

{
    echo "=========================================="
    echo "自動化測試報告"
    echo "生成時間: $(date)"
    echo "測試目標: $BASE_URL"
    echo "=========================================="
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. 伺服器狀態檢查"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if curl -s "$BASE_URL" > /dev/null"; then
        echo "✅ 伺服器正在運行"
    else
        echo "❌ 伺服器未運行"
    fi
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "2. 前端頁面測試"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    for page in "/" "/checkin" "/lottery" "/admin/login" "/admin/attendance_management"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$page" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ $page - HTTP $HTTP_CODE"
        else
            echo "❌ $page - HTTP $HTTP_CODE"
        fi
    done
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "3. API 端點測試"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    for api in "/api/members" "/api/meetings" "/api/checkins" "/api/prizes" "/api/statistics/member-attendance" "/api/lottery/winners"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$api" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ $api - HTTP $HTTP_CODE"
        else
            echo "❌ $api - HTTP $HTTP_CODE"
        fi
    done
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "4. 資料庫連接測試"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DB_RESPONSE=$(curl -s "$BASE_URL/api/members" 2>/dev/null || echo "")
    if echo "$DB_RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
        echo "✅ 資料庫連接正常"
        MEMBER_COUNT=$(echo "$DB_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('members', [])))" 2>/dev/null || echo "N/A")
        echo "   會員數量: $MEMBER_COUNT"
    else
        echo "❌ 資料庫連接失敗"
    fi
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "5. 構建測試"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if npm run build > /dev/null 2>&1; then
        echo "✅ 構建成功"
    else
        echo "❌ 構建失敗"
    fi
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "6. 系統資訊"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Node.js 版本: $(node --version 2>/dev/null || echo 'N/A')"
    echo "npm 版本: $(npm --version 2>/dev/null || echo 'N/A')"
    echo "Next.js 版本: $(npm list next 2>/dev/null | grep next | head -1 || echo 'N/A')"
    echo ""
    
} | tee "$REPORT_FILE"

echo ""
echo "✅ 測試報告已保存到: $REPORT_FILE"
