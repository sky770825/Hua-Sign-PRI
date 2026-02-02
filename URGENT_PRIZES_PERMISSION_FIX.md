# 🚨 緊急修復：獎品權限問題

## ❌ 當前狀態

測試顯示權限問題仍然存在：
- 錯誤碼：42501
- 錯誤訊息：permission denied for table estate_attendance_prizes

## 🔍 問題分析

### 可能原因

1. **SQL 未正確執行**
   - 可能執行了錯誤的 SQL
   - 可能執行了錯誤的專案

2. **API 使用錯誤的客戶端**
   - API 使用 `supabase`（anon key）而不是 `supabaseService`（service_role key）
   - anon key 需要 RLS 政策或禁用 RLS

3. **RLS 政策設置不正確**
   - RLS 已啟用但政策不允許操作

## ✅ 完整修復步驟

### 步驟 1: 確認 Supabase 專案

**確認您執行 SQL 的專案是：**
- Project ID: `kwxlxjfcdghpguypadvi`
- URL: `https://sqgrnowrcvspxhuudrqc.supabase.co`

### 步驟 2: 執行修復 SQL（必須）

**在 Supabase SQL Editor 中執行：**

```sql
-- 禁用 RLS（最簡單的方式）
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

**或執行完整腳本：**
- 打開文件：`fix_prizes_permissions.sql`
- 複製全部內容
- 貼上到 SQL Editor
- 點擊 "Run" 執行

### 步驟 3: 驗證修復

**執行驗證 SQL：**

```sql
-- 檢查 RLS 狀態
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
```

**應該看到：**
- `rls_enabled: false`（如果使用方案 1）

### 步驟 4: 測試插入

**在 SQL Editor 中測試：**

```sql
-- 測試插入（使用 anon key 權限）
INSERT INTO estate_attendance_prizes (name, total_quantity, remaining_quantity, probability)
VALUES ('測試獎品', 1, 1, 1.0)
RETURNING *;
```

**如果成功，應該返回插入的記錄。**

### 步驟 5: 清理測試數據

```sql
-- 刪除測試獎品
DELETE FROM estate_attendance_prizes WHERE name = '測試獎品';
```

## 🔧 替代方案：修改 API 使用 service_role key

如果禁用 RLS 後仍然失敗，可以修改 API 使用 `supabaseService`：

**修改 `app/api/prizes/route.ts`：**

將第 248 行：
```typescript
const { data: insertedPrizes, error: insertError } = await supabase
```

改為：
```typescript
const { data: insertedPrizes, error: insertError } = await supabaseService
```

這樣可以使用 service_role key，可以繞過 RLS。

## 📋 檢查清單

- [ ] 已確認 Supabase 專案正確
- [ ] 已執行 `ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;`
- [ ] 已驗證 RLS 已禁用
- [ ] 已測試插入功能（在 SQL Editor 中）
- [ ] 已在網頁中重新嘗試新增獎品
- [ ] 新增獎品成功

## 🔗 相關連結

- **Supabase SQL Editor**: https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
- **修復腳本**: `fix_prizes_permissions.sql`
- **API 路由**: `app/api/prizes/route.ts`

## ⚠️ 如果仍然失敗

請提供：
1. SQL Editor 中執行修復 SQL 的結果截圖
2. 驗證 SQL 的結果
3. 瀏覽器控制台的完整錯誤訊息

我可以根據這些信息進一步診斷問題。
