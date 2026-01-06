/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    // 允許從 Insforge Storage 載入圖片
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 輸出配置（用於 Vercel 部署）
  output: 'standalone',
}

module.exports = nextConfig

