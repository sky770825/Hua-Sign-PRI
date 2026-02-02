# Cloudflare Pages + Next.js 14 完整修復指南

## 🔍 問題診斷

### ✅ 程式碼檢查：全部正常
- 所有頁面文件正常
- 所有 API 路由正常
- 配置文件正確
- 本地構建成功

### ❌ 問題：Next.js 14 在 Cloudflare Pages 需要特殊配置

根據官方文檔和社區反饋，Next.js 14 在 Cloudflare Pages 上需要：

1. **適配器**（如果使用 SSR/API 路由）
2. **Compatibility Flags**（必須設置）
3. **正確的構建輸出目錄**

## ✅ 解決方案（推薦）

### 方案 A: 使用 @cloudflare/next-on-pages 適配器（支持 API 路由）

#### 步驟 1: 安裝適配器

```bash
npm install --save-dev @cloudflare/next-on-pages
```

#### 步驟 2: 修改 package.json

```json
{
  "scripts": {
    "build": "next build",
    "build:cloudflare": "next build && npx @cloudflare/next-on-pages",
    "preview": "npx wrangler pages dev .vercel/output/static"
  }
}
```

#### 步驟 3: 在 Cloudflare Pages Dashboard 設置

**構建命令：**
```
npm run build:cloudflare
```

**構建輸出目錄：**
```
.vercel/output/static
```

**Node.js 版本：**
```
18
```

#### 步驟 4: 設置 Compatibility Flags（必須）

前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

**設置 Compatibility Flags：**
- 添加：`nodejs_compat`
- 應用於：生產和預覽環境

### 方案 B: 使用靜態導出（不支持 API 路由）

⚠️ **不推薦**，因為您的項目使用 API 路由。

如果必須使用，需要：
1. 修改 `next.config.js` 添加 `output: 'export'`
2. 移除所有 API 路由
3. 構建輸出目錄設置為 `out`

## 🔧 立即修復步驟（推薦方案 A）

### 步驟 1: 安裝適配器

```bash
npm install --save-dev @cloudflare/next-on-pages
```

### 步驟 2: 更新構建命令

在 `package.json` 中更新：

```json
{
  "scripts": {
    "build:cloudflare": "next build && npx @cloudflare/next-on-pages"
  }
}
```

### 步驟 3: 在 Cloudflare Dashboard 設置

**構建設置：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

- **構建命令**：`npm run build:cloudflare`
- **構建輸出目錄**：`.vercel/output/static`
- **Node.js 版本**：`18`

**Functions 設置：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

- **Compatibility Flags**：添加 `nodejs_compat`
- 應用於：生產和預覽環境

**環境變數：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

確認已設置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

### 步驟 4: 觸發新部署

完成設置後，在 Dashboard 中點擊「重新部署」。

## 📋 檢查清單

完成以下所有項目：

- [ ] 已安裝 `@cloudflare/next-on-pages`
- [ ] 已更新 `build:cloudflare` 命令
- [ ] 構建命令設置為 `npm run build:cloudflare`
- [ ] 構建輸出目錄設置為 `.vercel/output/static`
- [ ] Node.js 版本設置為 `18`
- [ ] **已設置 Compatibility Flags: `nodejs_compat`**（最重要！）
- [ ] 環境變數已正確設置（3個變數）
- [ ] 已觸發新部署
- [ ] 已等待構建完成（2-5 分鐘）
- [ ] 網站返回 HTTP 200

## 🔗 重要連結

- **構建設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds
- **Functions 設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
- **環境變數**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

## ⚠️ 關鍵提示

**最常見的錯誤是缺少 Compatibility Flags！**

即使構建成功，如果沒有設置 `nodejs_compat`，Next.js 14 的功能可能無法正常工作，導致 404 錯誤。
