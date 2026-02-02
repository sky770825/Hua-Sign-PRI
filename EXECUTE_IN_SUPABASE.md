# 在 Supabase SQL Editor 中執行 SQL

## 🔗 您提供的連結

https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

這是您的 Supabase 專案的 SQL Editor 頁面。

## 📋 可執行的 SQL 腳本

### 1. 創建資料表（如果尚未創建）

**推薦使用：** `create_estate_attendance_tables_organized.sql`

這個文件包含：
- ✅ 5 個主要資料表的完整結構
- ✅ 所有索引
- ✅ 所有觸發器
- ✅ 詳細的註釋說明

**執行步驟：**
1. 打開上面的 Supabase SQL Editor 連結
2. 打開文件：`create_estate_attendance_tables_organized.sql`
3. 複製全部內容
4. 貼上到 SQL Editor
5. 點擊 "Run" 或按 `Ctrl+Enter`（Windows）或 `Cmd+Enter`（Mac）

### 2. 驗證資料表是否正確建立

**使用：** `verify_estate_attendance_tables.sql`

**執行步驟：**
1. 在 SQL Editor 中打開 `verify_estate_attendance_tables.sql`
2. 複製全部內容
3. 貼上並執行
4. 檢查結果，確認所有表都顯示 ✅

### 3. 備份資料庫結構

**使用：** `backup_database.sql`

這個文件包含完整的資料庫結構備份。

### 4. 導出數據

**使用：** `export_database_data.sql`

這個文件會導出所有數據為 INSERT 語句。

## 🎯 推薦執行順序

### 第一次設置（如果表尚未創建）

1. **創建資料表**
   - 執行：`create_estate_attendance_tables_organized.sql`
   - 等待執行完成

2. **驗證表結構**
   - 執行：`verify_estate_attendance_tables.sql`
   - 確認所有表都顯示 ✅

3. **完成！**
   - 資料庫結構已建立
   - 可以開始使用系統

### 定期備份

1. **備份結構**
   - 執行：`backup_database.sql`
   - 保存結果

2. **導出數據（可選）**
   - 執行：`export_database_data.sql`
   - 複製結果並保存

## 📝 快速執行指南

### 步驟 1: 打開 SQL Editor

點擊您提供的連結：
https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

### 步驟 2: 選擇要執行的 SQL 文件

**推薦文件：**
- `create_estate_attendance_tables_organized.sql` - 創建表結構（推薦）
- `verify_estate_attendance_tables.sql` - 驗證表結構
- `backup_database.sql` - 備份結構

### 步驟 3: 複製並執行

1. 打開選定的 SQL 文件
2. 複製全部內容（`Ctrl+A` 然後 `Ctrl+C`）
3. 貼上到 SQL Editor（`Ctrl+V`）
4. 點擊 "Run" 按鈕或按 `Ctrl+Enter`

### 步驟 4: 檢查結果

- ✅ 如果成功，會顯示 "Success" 或 "Query executed successfully"
- ❌ 如果有錯誤，會顯示錯誤訊息

## ⚠️ 注意事項

1. **執行前確認**
   - 確認您有執行 SQL 的權限
   - 確認資料庫連接正常

2. **備份現有數據**
   - 如果表已存在且有數據，執行前請先備份
   - 使用 `export_database_data.sql` 導出數據

3. **執行順序**
   - 必須先創建表，才能導入數據
   - 外鍵約束要求先創建被引用的表

## 🔍 如果遇到錯誤

### 錯誤 1: "relation already exists"
- **原因**：表已經存在
- **解決**：使用 `CREATE TABLE IF NOT EXISTS`（腳本已包含）

### 錯誤 2: "permission denied"
- **原因**：沒有執行權限
- **解決**：確認您有專案的管理權限

### 錯誤 3: "syntax error"
- **原因**：SQL 語法錯誤
- **解決**：檢查 SQL 語句，確認沒有複製錯誤

## 📋 檢查清單

執行前：
- [ ] 已打開 Supabase SQL Editor
- [ ] 已選擇要執行的 SQL 文件
- [ ] 已確認資料庫連接正常

執行後：
- [ ] 已看到 "Success" 訊息
- [ ] 已執行驗證腳本確認表已建立
- [ ] 已檢查所有表是否正確

## 🔗 相關文件

- `create_estate_attendance_tables_organized.sql` - 創建表結構（推薦）
- `verify_estate_attendance_tables.sql` - 驗證表結構
- `backup_database.sql` - 備份結構
- `export_database_data.sql` - 導出數據
- `DATABASE_BACKUP.md` - 完整備份說明
