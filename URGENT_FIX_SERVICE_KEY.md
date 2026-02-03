# 🚨 緊急修復：SUPABASE_SERVICE_KEY 不正確

## ❌ 當前問題

**錯誤訊息**: `Invalid API key`

**根本原因**: `.env.local` 中的 `SUPABASE_SERVICE_KEY` 是 Supabase CLI access token，不是資料庫的 service_role key

**錯誤範例**: `sbp_xxxx...`（Supabase CLI token，不可用於 API）

## ✅ 解決方案

### 步驟 1: 獲取正確的 service_role key

1. **前往 Supabase Dashboard**：
   ```
   https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
   ```

2. **找到 Project API keys 區塊**：
   - 會看到兩個 key：
     - `anon` `public` - 這是公開的匿名 key（前端使用）
     - `service_role` `secret` - 這是服務端 key（後端使用）⚠️

3. **複製 service_role key**：
   - 點擊 `service_role` key 旁邊的 "Reveal" 或 "Copy" 按鈕
   - 複製完整的 JWT token（很長，200+ 字符）
   - 格式應該是：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIxMTE2NiwiZXhwIjoyMDgzNzg3MTY2fQ.xxxxx...`

### 步驟 2: 更新 .env.local

編輯 `.env.local` 文件，將 `SUPABASE_SERVICE_KEY` 更新為正確的 service_role key：

```bash
# Supabase 配置（從 Dashboard > Settings > API 取得）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ⚠️ 重要：必須是 service_role 的 JWT（eyJ 開頭），不能用 sbp_ 開頭的 CLI token
SUPABASE_SERVICE_KEY=your_service_role_jwt_here
```

### 步驟 3: 重新啟動開發伺服器

```bash
# 停止當前伺服器（按 Ctrl+C）
npm run dev
```

### 步驟 4: 驗證修復

```bash
# 測試 API
curl http://localhost:3000/api/prizes
```

**預期結果**：
- 應該返回 `{"prizes": [...]}` 或 `{"success": true, "data": [...]}`
- 不應該有 `Invalid API key` 或 `permission denied` 錯誤

## 🔑 重要區別

### ❌ 錯誤的 key（勿使用）
- `sbp_xxxx...` 格式
- 這是 Supabase CLI access token
- 用於 CLI 操作，不能用於資料庫 API

### ✅ 正確的 key（需要）
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIxMTE2NiwiZXhwIjoyMDgzNzg3MTY2fQ.xxxxx...`
- 這是 JWT token 格式的 service_role key
- 用於資料庫 API，可以繞過 RLS

## 📋 檢查清單

- [ ] 已前往 Supabase Dashboard API 設置頁面
- [ ] 已找到 `service_role` key（不是 `anon` key）
- [ ] 已複製完整的 JWT token
- [ ] 已更新 `.env.local` 中的 `SUPABASE_SERVICE_KEY`
- [ ] 已重新啟動開發伺服器
- [ ] API 測試成功（沒有 `Invalid API key` 錯誤）

## 🔗 相關連結

- **Supabase Dashboard**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc
- **API Keys**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new

## ⚠️ 注意事項

- `service_role` key 是 **secret key**，不要公開
- 不要提交到 Git（`.env.local` 應該在 `.gitignore` 中）
- 只在伺服器端使用，不要在前端代碼中使用
