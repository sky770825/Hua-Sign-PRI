# 🚨 最終修復：獎品權限問題

## ❌ 當前問題

錯誤訊息：`permission denied for table estate_attendance_prizes`

**根本原因**：
- `SUPABASE_SERVICE_KEY` 環境變數未設置
- `supabaseService` 回退到 `anon` key
- `anon` key 仍然受到 RLS 限制

## ✅ 解決方案（兩種方式，建議同時執行）

### 方式 1: 禁用 RLS（必須執行）

**在 Supabase SQL Editor 中執行：**

```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

**驗證是否成功：**

```sql
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
```

**應該看到 `rls_enabled: false`**

### 方式 2: 設置 SUPABASE_SERVICE_KEY（推薦）

**獲取 Service Role Key：**

1. 前往 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/settings/api
   ```

2. 在 "Project API keys" 區塊找到：
   - **`service_role`** key（⚠️ 這是 secret key，不要公開）

3. 複製 `service_role` key

**設置環境變數：**

**本地開發（`.env.local`）：**

創建或編輯 `.env.local` 文件：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://sqgrnowrcvspxhuudrqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw

# ⚠️ 重要：Service Role Key（可以繞過 RLS）
SUPABASE_SERVICE_KEY=你的_service_role_key_在這裡
```

**⚠️ 重要：**
- `SUPABASE_SERVICE_KEY` 的值必須是 `service_role` key，不是 `anon` key
- 設置後必須重新啟動開發伺服器

## 🔄 執行步驟

### 步驟 1: 執行 SQL（必須）

在 Supabase SQL Editor 中執行：
```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

### 步驟 2: 設置環境變數（推薦）

1. 獲取 `service_role` key（從 Supabase Dashboard）
2. 創建 `.env.local` 文件
3. 添加 `SUPABASE_SERVICE_KEY=你的_service_role_key`

### 步驟 3: 重新啟動伺服器

```bash
# 停止當前伺服器（按 Ctrl+C）
# 然後重新啟動
npm run dev
```

### 步驟 4: 測試

1. 在網頁中嘗試查詢獎品列表
2. 嘗試新增獎品
3. 應該可以成功

## 🔍 驗證修復

**測試 API：**

```bash
# 測試查詢
curl http://localhost:3000/api/prizes

# 應該返回 JSON，而不是錯誤
```

**檢查環境變數：**

在代碼中添加臨時日誌（或檢查伺服器日誌）：

```typescript
console.log('Service Key Set:', !!process.env.SUPABASE_SERVICE_KEY);
```

## ⚠️ 注意事項

1. **Service Role Key 是機密**：
   - 不要提交到 Git
   - 不要在前端代碼中使用
   - 只在伺服器端使用

2. **RLS 與 Service Role Key**：
   - Service Role Key 可以繞過 RLS
   - 但建議同時禁用 RLS 以確保完全修復

3. **生產環境**：
   - 在部署平台（Cloudflare Pages/Vercel）中設置環境變數
   - 不要使用 `.env.local`（這是本地開發用的）

## 📋 完整檢查清單

- [ ] 已在 Supabase SQL Editor 中執行 `ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;`
- [ ] 已驗證 RLS 已禁用（`rls_enabled: false`）
- [ ] 已從 Supabase Dashboard 獲取 `service_role` key
- [ ] 已創建 `.env.local` 文件
- [ ] 已設置 `SUPABASE_SERVICE_KEY` 環境變數
- [ ] 已重新啟動開發伺服器
- [ ] 已測試查詢獎品列表（成功）
- [ ] 已測試新增獎品（成功）

## 🔗 相關連結

- **Supabase Dashboard**: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi
- **API Keys**: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
