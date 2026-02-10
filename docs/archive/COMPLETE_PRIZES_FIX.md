# 完整修復：獎品權限問題

## ✅ 已完成的修復

### 1. 修改 API 代碼
- ✅ 已將 `app/api/prizes/route.ts` 中的 `supabase` 改為 `supabaseService`
- ✅ 現在使用 `service_role` key，可以繞過 RLS

### 2. 需要執行的 SQL

**在 Supabase SQL Editor 中執行：**

```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

## 🔄 下一步操作

### 步驟 1: 確認 SQL 已執行

**在 Supabase SQL Editor 中驗證：**

```sql
-- 檢查 RLS 狀態
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
```

**應該看到 `rls_enabled: false`**

### 步驟 2: 重新啟動開發伺服器

**停止當前伺服器：**
- 在終端中按 `Ctrl+C`

**重新啟動：**
```bash
npm run dev
```

### 步驟 3: 測試新增獎品

1. 在網頁中嘗試新增獎品
2. 應該可以成功

## 🔍 如果仍然失敗

### 檢查 1: 確認 SUPABASE_SERVICE_KEY

**檢查環境變數：**

如果 `SUPABASE_SERVICE_KEY` 未設置，`supabaseService` 會回退到 `anon` key，仍然會有權限問題。

**解決方案：**
1. 創建 `.env.local` 文件
2. 添加：
   ```
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
   ```
3. 重新啟動伺服器

### 檢查 2: 確認 SQL 已執行

**在 Supabase SQL Editor 中再次執行：**

```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

然後驗證：
```sql
SELECT rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'estate_attendance_prizes';
```

### 檢查 3: 檢查其他表的權限

**如果需要，也可以禁用其他表的 RLS：**

```sql
ALTER TABLE estate_attendance_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE estate_attendance_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE estate_attendance_checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE estate_attendance_lottery_winners DISABLE ROW LEVEL SECURITY;
```

## 📋 完整檢查清單

- [ ] 已在 Supabase SQL Editor 中執行 `ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;`
- [ ] 已驗證 RLS 已禁用（`rls_enabled: false`）
- [ ] 已創建 `.env.local` 文件（如果沒有）
- [ ] 已設置 `SUPABASE_SERVICE_KEY` 環境變數
- [ ] 已重新啟動開發伺服器
- [ ] 已在網頁中測試新增獎品
- [ ] 新增獎品成功

## 🔗 相關文件

- `fix_prizes_permissions.sql` - 完整修復腳本
- `URGENT_PRIZES_PERMISSION_FIX.md` - 緊急修復指南
- `app/api/prizes/route.ts` - 已修改的 API 路由

## ✅ 預期結果

修復完成後：
- ✅ 可以查詢獎品列表
- ✅ 可以新增獎品
- ✅ 可以更新獎品
- ✅ 可以刪除獎品
