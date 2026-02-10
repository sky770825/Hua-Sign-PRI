# Cloudflare Pages CLI 自動化設置指南

## 🚀 快速開始

### 1. 執行自動化設置腳本

```bash
# 方式 1: 使用 npm 腳本
npm run setup:cloudflare

# 方式 2: 直接執行腳本
bash scripts/setup-cloudflare.sh
```

### 2. 檢查登入狀態

```bash
wrangler whoami
```

如果未登入，會自動提示登入：
```bash
wrangler login
```

### 3. 查看專案列表

```bash
wrangler pages project list
```

## 📋 自動化腳本說明

### `scripts/setup-cloudflare.sh`
基礎設置腳本，檢查和創建專案。

### `scripts/deploy-cloudflare.sh`
部署腳本，構建並部署到 Cloudflare Pages。

### `scripts/auto-setup-cloudflare.sh`
完全自動化設置腳本（包含所有步驟）。

## ⚙️ 環境變數設置

### 使用 CLI 設置環境變數

由於 Cloudflare Pages 的環境變數設置需要通過 Dashboard 或 API，CLI 目前無法直接設置。

### 手動設置（推薦）

1. 前往 Dashboard：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

2. 添加以下環境變數：

   ```
   NEXT_PUBLIC_SUPABASE_URL = https://sqgrnowrcvspxhuudrqc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
   SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
   ```

### 使用 API 自動設置（進階）

如果需要完全自動化，可以使用 Cloudflare API：

```bash
# 需要設置 CLOUDFLARE_API_TOKEN 環境變數
export CLOUDFLARE_API_TOKEN="your-api-token"

# 使用 curl 設置環境變數
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/projects/hua-sign-pri" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "build_config": {
      "build_command": "npm run build",
      "destination_dir": ".next",
      "root_dir": "/",
      "web_analytics_tag": null,
      "web_analytics_token": null
    }
  }'
```

## 🔗 連接 Git 倉庫

### 使用 Dashboard（推薦）

1. 前往專案頁面：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri

2. 點擊「連接 Git 倉庫」
3. 選擇 GitHub 並授權
4. 選擇倉庫：`sky770825/Hua-Sign-PRI`
5. 分支：`main`

### 構建設置

在 Dashboard 的「構建和部署」設置中：

- **構建命令**：`npm run build`
- **構建輸出目錄**：`.next`
- **Node.js 版本**：`18`
- **根目錄**：`/`（留空）

## 🚀 部署

### 自動部署（推送到 Git）

當您推送到 `main` 分支時，Cloudflare Pages 會自動觸發構建和部署。

### 手動部署（使用 CLI）

```bash
# 構建專案
npm run build

# 部署到 Cloudflare Pages
npm run deploy:cloudflare
```

或直接使用 wrangler：

```bash
wrangler pages deploy .next --project-name=hua-sign-pri
```

## 📊 常用命令

```bash
# 查看專案列表
wrangler pages project list

# 查看專案詳情
wrangler pages project get hua-sign-pri

# 查看部署歷史
wrangler pages deployment list --project-name=hua-sign-pri

# 查看部署詳情
wrangler pages deployment get <deployment-id> --project-name=hua-sign-pri

# 刪除專案（謹慎使用）
wrangler pages project delete hua-sign-pri
```

## 🔧 故障排除

### 問題：wrangler 未安裝

```bash
npm install -g wrangler
```

### 問題：未登入

```bash
wrangler login
```

### 問題：權限不足

確保您的 Cloudflare 帳號有 Pages 的寫入權限。

### 問題：構建失敗

1. 檢查 Node.js 版本（需要 18+）
2. 檢查環境變數是否正確設置
3. 查看構建日誌：`wrangler pages deployment list --project-name=hua-sign-pri`

## 📚 相關資源

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
