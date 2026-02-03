# Vercel 自動化部署

## 指令

| 指令 | 說明 |
|------|------|
| `npm run setup:vercel` | 從 `.env.local` 同步 Supabase 環境變數到 Vercel |
| `npm run deploy:vercel` | 同步環境變數 + 部署到 Vercel Production |
| `npm run setup:vercel -- --output-only` | 僅輸出變數，供手動貼到 Vercel Dashboard |
| `npm run setup:vercel -- --project 專案名稱` | 指定要連結的 Vercel 專案 |

## 前置條件

1. **安裝 Vercel CLI**：`npm i -g vercel`
2. **登入**：執行 `vercel login`（若尚未登入）
3. **設定 `.env.local`**：複製 `.env.local.example` 為 `.env.local`，填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`

## 使用流程

### 首次設定

```bash
# 1. 確保 .env.local 已設定
cp .env.local.example .env.local
# 編輯 .env.local 填入金鑰

# 2. 連結 Vercel 專案（會跳出互動選單）
vercel link

# 3. 同步環境變數
npm run setup:vercel

# 4. 部署
npm run deploy:vercel
```

### 若 CLI 連結失敗（"Detected linked project does not have id"）

1. 到 [Vercel Dashboard](https://vercel.com) 確認專案存在且可存取
2. 刪除本地 `.vercel` 資料夾：`rm -rf .vercel`
3. 使用 **輸出模式** 取得變數，改由 Dashboard 手動設定：

   ```bash
   npm run setup:vercel -- --output-only
   ```

4. 將輸出的變數貼到 Vercel → 專案 → Settings → Environment Variables → Bulk Edit
5. 觸發 Redeploy

### 日常部署

```bash
# 推送程式碼後，若 Vercel 已連接 GitHub，會自動部署
git push

# 或手動部署
npm run deploy:vercel
```
