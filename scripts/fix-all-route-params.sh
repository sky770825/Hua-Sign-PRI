#!/bin/bash

# 修復所有 API 路由的 params 解析問題（Next.js 15+）

echo "════════════════════════════════════════════════"
echo "  🔧 修復所有路由參數解析"
echo "════════════════════════════════════════════════"
echo ""

FILES=(
  "app/api/members/[id]/route.ts"
  "app/api/meetings/[id]/route.ts"
  "app/api/lottery/winners/[id]/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 檢查: $file"
    
    # 檢查是否已經修復
    if grep -q "params instanceof Promise" "$file"; then
      echo "  ✅ 已修復"
    else
      echo "  ⚠️  需要修復"
    fi
  else
    echo "  ❌ 文件不存在"
  fi
  echo ""
done

echo "✅ 檢查完成"
