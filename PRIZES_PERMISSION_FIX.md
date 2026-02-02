# 修復獎品新增失敗 - 權限錯誤

## 🔍 錯誤診斷

### 錯誤訊息
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
/api/prizes:1 Failed to load resource: the server responded with a status of 500
Error saving prize: Object
新增獎品失敗
```

### 根本原因

從伺服器日誌可以看到：
```
Error creating prize: {
  error: {
    code: '42501',
    message: 'permission denied for table estate_attendance_prizes'
  }
}
```

**錯誤碼 42501** 是 PostgreSQL 的權限錯誤，表示：
- `estate_attendance_prizes` 表存在
- 但沒有 INSERT 權限
- 可能是 RLS (Row Level Security) 政策問題

## ✅ 解決方案

### 方案 1: 禁用 RLS（最簡單，適合開發環境）

**在 Supabase SQL Editor 中執行：**

```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

**優點：**
- ✅ 最簡單快速
- ✅ 立即解決問題
- ✅ 適合開發和測試環境

**缺點：**
- ⚠️ 不適合生產環境（安全性較低）

### 方案 2: 設置 RLS 政策（推薦用於生產環境）

**在 Supabase SQL Editor 中執行：**

```sql
-- 啟用 RLS
ALTER TABLE estate_attendance_prizes ENABLE ROW LEVEL SECURITY;

-- 創建允許所有操作的政策
CREATE POLICY "Enable read access for all users"
ON estate_attendance_prizes
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users"
ON estate_attendance_prizes
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON estate_attendance_prizes
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON estate_attendance_prizes
FOR DELETE
TO public
USING (true);
```

**優點：**
- ✅ 保持 RLS 啟用（更安全）
- ✅ 適合生產環境
- ✅ 可以根據需要調整政策

### 方案 3: 使用完整修復腳本

**執行文件：** `fix_prizes_permissions.sql`

這個文件包含：
- 方案 1（禁用 RLS）
- 方案 2（設置 RLS 政策）
- 驗證查詢

## 🚀 立即修復步驟

### 步驟 1: 前往 Supabase SQL Editor

**🔗 直接連結：**
https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

### 步驟 2: 執行修復 SQL

**推薦使用方案 1（最簡單）：**

```sql
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
```

或執行完整腳本：
- 打開文件：`fix_prizes_permissions.sql`
- 複製全部內容
- 貼上到 SQL Editor
- 點擊 "Run" 執行

### 步驟 3: 驗證修復

執行後，重新嘗試新增獎品，應該可以成功。

## 📋 檢查清單

- [ ] 已前往 Supabase SQL Editor
- [ ] 已執行修復 SQL（禁用 RLS 或設置政策）
- [ ] 已驗證修復（重新嘗試新增獎品）
- [ ] 新增獎品成功

## 🔍 為什麼會發生這個問題？

1. **RLS 已啟用但沒有政策**
   - Supabase 默認啟用 RLS
   - 如果沒有設置政策，所有操作都會被拒絕

2. **政策設置不正確**
   - 現有政策可能只允許特定用戶
   - 使用 `anon` key 時可能沒有權限

3. **API Key 權限不足**
   - 使用 `service_role` key 可以繞過 RLS
   - 但可能環境變數設置不正確

## ⚠️ 注意事項

### 如果使用方案 1（禁用 RLS）

- ✅ 適合開發環境
- ⚠️ 生產環境建議使用方案 2

### 如果使用方案 2（設置 RLS 政策）

- ✅ 更安全
- ✅ 可以根據需要調整政策
- ⚠️ 需要確保政策正確設置

## 🔗 相關文件

- `fix_prizes_permissions.sql` - 完整修復腳本
- `app/api/prizes/route.ts` - 獎品 API 路由
- `DATABASE_CHECK_REPORT.md` - 資料庫檢查報告

## ✅ 修復後

修復完成後：
1. 重新嘗試新增獎品
2. 應該可以成功
3. 如果仍有問題，檢查伺服器日誌
