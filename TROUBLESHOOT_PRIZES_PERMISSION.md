# 獎品權限問題故障排除

## ❌ 當前問題

驗證後發現權限問題仍然存在：
- API 返回 `Invalid API key`
- 仍然有 `permission denied for table estate_attendance_prizes` 錯誤

## 🔍 可能的原因

### 1. SUPABASE_SERVICE_KEY 不正確

**檢查方法**：
```bash
cat .env.local | grep SUPABASE_SERVICE_KEY
```

**問題**：
- 如果使用的是 `anon` key 而不是 `service_role` key
- `service_role` key 應該以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 開頭（JWT token）
- 不是 `sbp_` 開頭的 key

**解決方案**：
1. 前往 Supabase Dashboard：
   https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
2. 找到 **`service_role`** key（不是 `anon` key）
3. 複製該 key
4. 更新 `.env.local` 中的 `SUPABASE_SERVICE_KEY`

### 2. 開發伺服器未重新啟動

**問題**：
- 環境變數更改後需要重新啟動伺服器才能生效

**解決方案**：
```bash
# 停止當前伺服器（按 Ctrl+C）
# 然後重新啟動
npm run dev
```

### 3. SQL 未正確執行

**檢查方法**：
在 Supabase SQL Editor 中執行：
```sql
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
```

**預期結果**：
- `rls_enabled` 應該是 `false`

**如果仍然是 `true`**：
重新執行修復 SQL：
```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

## ✅ 完整修復步驟

### 步驟 1: 確認並更新 SUPABASE_SERVICE_KEY

1. 前往 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
   ```

2. 找到 **`service_role`** key（⚠️ 這是 secret key）

3. 更新 `.env.local`：
   ```bash
   SUPABASE_SERVICE_KEY=你的_service_role_key_在這裡
   ```

### 步驟 2: 確認 SQL 已執行

在 Supabase SQL Editor 中驗證：
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'estate_attendance_prizes';
```

如果 `rowsecurity = true`，執行：
```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
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

# 應該返回 JSON，而不是錯誤
```

## 🔑 重要提醒

### service_role key vs anon key

- **`anon` key**：
  - 用於前端
  - 受到 RLS 限制
  - 格式：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- **`service_role` key**：
  - 用於後端/伺服器端
  - 可以繞過 RLS
  - 格式：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（也是 JWT）
  - ⚠️ 這是 secret key，不要公開

### 如何確認使用的是哪個 key

檢查 `lib/supabase.ts`：
```typescript
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey;
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
```

如果 `SUPABASE_SERVICE_KEY` 未設置，會回退到 `anon` key，仍然會有權限問題。

## 📋 檢查清單

- [ ] 已確認 `SUPABASE_SERVICE_KEY` 是 `service_role` key（不是 `anon` key）
- [ ] 已更新 `.env.local` 文件
- [ ] 已重新啟動開發伺服器
- [ ] 已在 Supabase 中驗證 RLS 已禁用（`rowsecurity = false`）
- [ ] API 測試成功（沒有權限錯誤）
- [ ] 網頁功能正常

## 🔗 相關連結

- **Supabase Dashboard**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc
- **API Keys**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
- **SQL Editor**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new
