/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 隱藏 Next.js 開發工具指示器（nextjs-portal）
  devIndicators: false,
  // 安全標頭
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
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
    // 允許從 Supabase Storage 載入圖片
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 輸出配置
  // standalone 模式適用於 Docker/自託管
  // 對於 Cloudflare Pages，可能需要移除或使用 'export'
  // output: 'standalone', // 暫時註解，Cloudflare Pages 可能需要不同的配置
  
  // Cloudflare Pages 優化：禁用緩存以減少構建輸出大小
  // 緩存文件可能超過 25 MiB 限制
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // 排除 cursor自動化指揮官目錄（這是獨立的工具，不應被 Next.js 編譯）
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/cursor自動化指揮官/**'],
    }
    return config
  },
  
  // Turbopack 配置（Next.js 16 默認使用 Turbopack）
  turbopack: {
    // 排除 cursor自動化指揮官目錄
    resolveAlias: {
      // 可以添加別名配置
    },
  },
}

module.exports = nextConfig

