# Cloudflare Pages 部署指南

## 📋 部署步驟

### 1. 在 Cloudflare Pages 中連接 GitHub 倉庫

1. 前往 [Cloudflare Pages 儀表板](https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri)
2. 點擊「連接 Git 倉庫」
3. 選擇 GitHub 並授權
4. 選擇倉庫：`sky770825/Hua-Sign-PRI`
5. 選擇分支：`main`

### 2. 構建設置

在 Cloudflare Pages 的構建設置中配置：

**構建命令：**
```bash
npm run build
```

**構建輸出目錄：**
```
.next
```

**Node.js 版本：**
```
18
```

**根目錄：**
```
/（留空，使用根目錄）
```

### 3. 環境變數設置

在 Cloudflare Pages 的「設置」→「環境變數」中添加以下變數：

#### 必填環境變數：

```
NEXT_PUBLIC_SUPABASE_URL=https://sqgrnowrcvspxhuudrqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
```

#### 可選環境變數（如果需要 Google Sheets 同步功能）：

```
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
```

**注意：** `GOOGLE_SHEETS_PRIVATE_KEY` 中的 `\n` 需要保留，Cloudflare Pages 會自動處理換行。

### 4. 構建配置

由於 Next.js 在 Cloudflare Pages 上需要特殊配置，請確保：

1. **構建命令**：`npm run build`
2. **構建輸出**：`.next`（但 Cloudflare Pages 可能需要調整）
3. **Node.js 版本**：18 或更高

### 5. 部署

1. 點擊「保存並部署」
2. 等待構建完成
3. 構建完成後，您的網站將自動部署

## ⚠️ 注意事項

### Next.js 在 Cloudflare Pages 上的限制

Cloudflare Pages 對 Next.js 的支持有限制：

1. **API 路由**：可能需要使用 Cloudflare Workers 來處理 API 路由
2. **服務端渲染（SSR）**：可能需要額外配置
3. **靜態導出**：如果遇到問題，可以考慮使用 `next export` 進行靜態導出

### 如果遇到構建錯誤

1. 檢查 Node.js 版本是否為 18 或更高
2. 確認所有環境變數都已正確設置
3. 檢查構建日誌中的錯誤訊息
4. 可能需要修改 `next.config.js` 以適應 Cloudflare Pages

### 替代方案

如果 Cloudflare Pages 無法直接支持 Next.js，可以考慮：

1. **使用 Cloudflare Workers**：將 API 路由遷移到 Workers
2. **靜態導出**：使用 `next export` 生成靜態網站
3. **使用其他平台**：Vercel（Next.js 官方平台）或 Netlify

## 🔗 相關連結

- [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
- [Next.js 部署文檔](https://nextjs.org/docs/deployment)
- [GitHub 倉庫](https://github.com/sky770825/Hua-Sign-PRI)
