/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 生產環境優化
  output: 'standalone', // 生成獨立部署包
  // 確保 API 路由在生產環境正常工作
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // 圖片優化配置
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

