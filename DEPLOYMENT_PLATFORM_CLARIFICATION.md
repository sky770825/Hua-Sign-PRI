# 部署平台說明

## ✅ 當前部署平台：Cloudflare Pages

**您的網站目前部署在 Cloudflare Pages，不是 Vercel。**

### 證據：

1. **網站域名：**
   - 主網站：`https://hua-sign-pri.pages.dev`
   - 這是 Cloudflare Pages 的標準域名格式（`*.pages.dev`）

2. **配置文件：**
   - `wrangler.toml` - Cloudflare Pages 配置文件
   - `.github/workflows/cloudflare-pages.yml` - Cloudflare Pages 部署工作流

3. **Dashboard 連結：**
   - https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri

## 📋 關於 Vercel 文檔

專案中有一些 Vercel 相關的文檔（如 `DEPLOY_VERCEL.md`、`VERCEL_DEPLOY_STEPS.md` 等），這些是：
- 之前的部署計劃或建議
- 備選部署方案
- 不是當前實際使用的部署平台

## 🎯 當前部署狀態

- **平台**：Cloudflare Pages
- **專案名稱**：hua-sign-pri
- **網站 URL**：https://hua-sign-pri.pages.dev
- **狀態**：目前遇到 404 錯誤，需要設置 `nodejs_compat`

## 🔧 修復 404 的步驟

由於網站部署在 **Cloudflare Pages**，需要：

1. **在 Cloudflare Pages Dashboard 中設置 `nodejs_compat`**
   - 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
   - 設置 Compatibility Flags

2. **檢查構建設置**
   - 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

## ❓ 如果想改用 Vercel

如果您想將網站遷移到 Vercel：

1. **優點**：
   - Vercel 對 Next.js 有更好的原生支持
   - 不需要設置 `nodejs_compat`
   - 部署更簡單

2. **步驟**：
   - 訪問 https://vercel.com
   - 使用 GitHub 登入
   - 導入倉庫 `sky770825/Hua-Sign-PRI`
   - 點擊 Deploy
   - 幾分鐘後獲得 `*.vercel.app` 域名

3. **注意**：
   - 需要重新設置環境變數
   - 需要更新所有文檔中的 URL

## ✅ 建議

**建議繼續使用 Cloudflare Pages**，因為：
- 已經配置完成
- 只需要設置 `nodejs_compat` 即可修復 404
- 不需要遷移

**或者遷移到 Vercel**，因為：
- 對 Next.js 支持更好
- 部署更簡單
- 不需要特殊配置

您想繼續使用 Cloudflare Pages 還是遷移到 Vercel？
