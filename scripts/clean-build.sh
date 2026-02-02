#!/bin/bash

# 清理構建緩存腳本
# 用於 Cloudflare Pages 部署，避免緩存文件超過 25 MiB 限制

echo "清理 Next.js 構建緩存..."

# 刪除 webpack 緩存
rm -rf .next/cache/webpack
rm -rf .next/cache/server-production
rm -rf .next/cache/client-production

# 保留其他必要的緩存（如果有）
# 只刪除過大的文件

echo "✅ 緩存清理完成"
