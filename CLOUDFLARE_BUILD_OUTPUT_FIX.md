# Cloudflare Pages 構建輸出目錄修復

## 🔍 當前問題

部署狀態顯示 "Active"，但網站返回 404。

這通常表示：
- 構建成功 ✅
- 部署成功 ✅
- 但構建輸出目錄配置不正確 ❌

## 📋 Next.js 在 Cloudflare Pages 上的配置

### 問題分析

Next.js 14 默認使用 `.next` 目錄作為構建輸出，但 Cloudflare Pages 可能需要：

1. **靜態導出模式** (`output: 'export'`)
   - 生成 `out` 目錄
   - 構建輸出目錄：`out`

2. **標準模式** (默認)
   - 生成 `.next` 目錄
   - 構建輸出目錄：留空（讓 Cloudflare 自動檢測）

### 當前配置

- 構建命令：`npm run build` 或 `npm run build:cloudflare`
- 構建輸出目錄：可能設置為 `.next`（不正確）

## ✅ 解決方案

### 方案 1: 使用靜態導出（推薦用於 Cloudflare Pages）

修改 `next.config.js`：

```javascript
const nextConfig = {
  output: 'export',
  // ... 其他配置
}
```

然後在 Cloudflare Pages Dashboard 設置：
- 構建命令：`npm run build`
- 構建輸出目錄：`out`

### 方案 2: 保持標準模式，正確設置輸出目錄

在 Cloudflare Pages Dashboard 設置：
- 構建命令：`npm run build:cloudflare`
- **構建輸出目錄：留空**（讓 Cloudflare 自動檢測 `.next` 目錄）

### 方案 3: 使用 wrangler.toml 配置

創建 `wrangler.toml` 文件：

```toml
name = "hua-sign-pri"
pages_build_output_dir = ".next"
```

## 🔧 立即修復步驟

### 步驟 1: 檢查當前構建設置

前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

檢查：
- 構建命令：應該是 `npm run build:cloudflare`
- **構建輸出目錄：應該留空或設置為 `.next`**

### 步驟 2: 如果使用靜態導出

1. 修改 `next.config.js` 添加 `output: 'export'`
2. 更新構建輸出目錄為 `out`
3. 注意：靜態導出不支持 API 路由和服務端功能

### 步驟 3: 如果保持標準模式

1. 確保構建輸出目錄**留空**（讓 Cloudflare 自動檢測）
2. 或明確設置為 `.next`
3. 確保構建命令是 `npm run build:cloudflare`

### 步驟 4: 觸發新部署

完成設置後，觸發新部署並等待完成。

## ⚠️ 重要注意事項

### Next.js 14 在 Cloudflare Pages 的限制

1. **API 路由**
   - 標準模式：支持 API 路由（需要 Node.js 運行時）
   - 靜態導出：不支持 API 路由

2. **服務端功能**
   - 標準模式：支持服務端渲染
   - 靜態導出：只支持靜態頁面

3. **構建輸出**
   - 標準模式：`.next` 目錄
   - 靜態導出：`out` 目錄

### 推薦配置（如果使用 API 路由）

由於您的項目使用 API 路由（`/api/*`），應該：

1. **保持標準模式**
2. **構建輸出目錄留空**（讓 Cloudflare 自動檢測）
3. 使用構建命令：`npm run build:cloudflare`

## 🔗 相關資源

- [Cloudflare Pages Next.js 文檔](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Next.js 靜態導出](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

## ✅ 驗證清單

完成以下步驟後，網站應該可以正常訪問：

- [ ] 已檢查構建輸出目錄設置（應該留空或 `.next`）
- [ ] 已確認構建命令為 `npm run build:cloudflare`
- [ ] 已觸發新部署
- [ ] 已等待構建完成（2-5 分鐘）
- [ ] 已驗證網站可以訪問（HTTP 200）
