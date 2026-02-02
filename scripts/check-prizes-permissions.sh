#!/bin/bash

# 檢查獎品權限修復狀態

echo "════════════════════════════════════════════════"
echo "  🔍 檢查獎品權限修復狀態"
echo "════════════════════════════════════════════════"
echo ""

# 檢查環境變數
echo "📋 環境變數檢查："
if [ -f .env.local ]; then
  echo "  ✅ .env.local 文件存在"
  if grep -q "SUPABASE_SERVICE_KEY" .env.local; then
    echo "  ✅ SUPABASE_SERVICE_KEY 已設置"
    SERVICE_KEY_SET=$(grep "SUPABASE_SERVICE_KEY" .env.local | cut -d'=' -f2)
    if [ -z "$SERVICE_KEY_SET" ] || [ "$SERVICE_KEY_SET" = "" ]; then
      echo "  ⚠️  SUPABASE_SERVICE_KEY 值為空"
    else
      echo "  ✅ SUPABASE_SERVICE_KEY 有值（長度: ${#SERVICE_KEY_SET} 字符）"
    fi
  else
    echo "  ❌ SUPABASE_SERVICE_KEY 未設置"
  fi
else
  echo "  ❌ .env.local 文件不存在"
fi

echo ""

# 檢查 API 是否可訪問
echo "📋 API 測試："
API_RESPONSE=$(curl -s http://localhost:3000/api/prizes 2>&1)
if echo "$API_RESPONSE" | grep -q "permission denied"; then
  echo "  ❌ API 仍然返回權限錯誤"
  echo "  💡 請確認："
  echo "     1. 已在 Supabase 中執行: ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;"
  echo "     2. 已設置 SUPABASE_SERVICE_KEY 環境變數"
  echo "     3. 已重新啟動開發伺服器"
elif echo "$API_RESPONSE" | grep -q "success"; then
  echo "  ✅ API 可以正常訪問"
else
  echo "  ⚠️  無法連接到 API（伺服器可能未啟動）"
fi

echo ""
echo "════════════════════════════════════════════════"
echo "  📋 修復步驟"
echo "════════════════════════════════════════════════"
echo ""
echo "1. 在 Supabase SQL Editor 中執行："
echo "   ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;"
echo ""
echo "2. 獲取 service_role key："
echo "   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/settings/api"
echo ""
echo "3. 創建 .env.local 文件並添加："
echo "   SUPABASE_SERVICE_KEY=你的_service_role_key"
echo ""
echo "4. 重新啟動開發伺服器："
echo "   npm run dev"
echo ""
