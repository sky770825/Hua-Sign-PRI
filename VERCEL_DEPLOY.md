# Vercel 部署指南

## 環境變數設定（必填）

在 Vercel 部署前，請在 **Project Settings > Environment Variables** 新增：

### 核心（必填）

| 變數名稱 | 說明 | 取得方式 |
|---------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role 金鑰（JWT 格式，非 sbp_ CLI token） | Supabase Dashboard → Settings → API |
| `ADMIN_PASSWORD` | 後台管理員密碼 | 自訂 |

### 選填（會員同步功能）

| 變數名稱 | 說明 |
|---------|------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets 試算表 ID |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Google 服務帳號 email |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Google 服務帳號私鑰（含 `\n` 換行） |

⚠️ **重要**：請勿將金鑰寫入程式碼或提交到 Git。一律使用環境變數。

## 部署步驟

### 方式一：從 GitHub 自動部署

1. 登入 [Vercel](https://vercel.com)
2. 點擊 **Add New** → **Project**
3. 選擇 GitHub 倉庫 `sky770825/Hua-Sign-PRI`
4. 在 **Environment Variables** 區塊填入上述變數
5. 點擊 **Deploy**

### 方式二：使用 CLI

```bash
# 確保已設定 .env.local（本地開發用）
# 部署時會在 Vercel 使用 Dashboard 設定的環境變數
vercel deploy --prod --yes
```

## 若遇部署失敗

1. **檢查帳戶狀態**：確認 Vercel 帳戶未暫停（需有效付款方式）
2. **確認環境變數**：Production、Preview、Development 皆需設定
3. **建置日誌**：到 Vercel Dashboard → Deployments → 點選失敗的部署 → 查看 Logs
4. **清除快取**：Settings → General → Build Cache → Clear，然後重新部署
5. **npm 錯誤**：若出現 ERESOLVE/peer dependency 錯誤，專案已含 `.npmrc` 設定 `legacy-peer-deps=true`
