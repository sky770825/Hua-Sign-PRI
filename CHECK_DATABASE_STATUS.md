# 檢查 Supabase 資料庫狀態

## 🔍 快速檢查方法

### 方法 1: 在 Supabase SQL Editor 中執行（推薦）

**🔗 前往 SQL Editor：**
https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new

**執行檢查腳本：**
1. 打開文件：`check_database_tables.sql`
2. 複製全部內容
3. 貼上到 SQL Editor
4. 點擊 "Run" 執行
5. 查看結果

**應該看到 5 個表：**
- ✅ estate_attendance_members
- ✅ estate_attendance_meetings
- ✅ estate_attendance_checkins
- ✅ estate_attendance_prizes
- ✅ estate_attendance_lottery_winners

### 方法 2: 使用驗證腳本

**執行：** `verify_estate_attendance_tables.sql`

這個腳本會詳細檢查：
- 表是否存在
- 表結構是否正確
- 索引是否建立
- 觸發器是否建立
- 數據統計

### 方法 3: 使用 API 檢查

**執行腳本：**
```bash
bash scripts/check-supabase-tables.sh
```

或使用 npm：
```bash
npm run check:database
```

## 📋 需要建立的資料表（5 個）

### 1. estate_attendance_members（會員表）
- **用途**：儲存會員基本資料
- **欄位**：id, name, profession, created_at, updated_at

### 2. estate_attendance_meetings（會議表）
- **用途**：儲存會議資訊
- **欄位**：id, date, status, created_at, updated_at

### 3. estate_attendance_checkins（簽到記錄表）
- **用途**：儲存會員的簽到記錄
- **欄位**：id, member_id, meeting_date, checkin_time, message, status, created_at, updated_at

### 4. estate_attendance_prizes（獎品表）
- **用途**：儲存抽獎獎品資訊
- **欄位**：id, name, image_url, total_quantity, remaining_quantity, probability, created_at, updated_at

### 5. estate_attendance_lottery_winners（中獎記錄表）
- **用途**：儲存抽獎中獎記錄
- **欄位**：id, meeting_date, member_id, prize_id, claimed_status, created_at

## ✅ 如果表未建立

### 執行創建腳本

**在 Supabase SQL Editor 中執行：**
`create_estate_attendance_tables_organized.sql`

**步驟：**
1. 前往：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
2. 打開文件：`create_estate_attendance_tables_organized.sql`
3. 複製全部內容
4. 貼上到 SQL Editor
5. 點擊 "Run" 執行
6. 等待執行完成

### 驗證表已建立

**執行驗證腳本：**
`verify_estate_attendance_tables.sql`

## 📊 檢查清單

- [ ] 已前往 Supabase SQL Editor
- [ ] 已執行 `check_database_tables.sql`
- [ ] 已確認 5 個表都顯示 ✅
- [ ] 如果看到 ❌，已執行 `create_estate_attendance_tables_organized.sql`
- [ ] 已執行 `verify_estate_attendance_tables.sql` 驗證

## 🔗 相關文件

- `check_database_tables.sql` - 快速檢查腳本（新建）
- `verify_estate_attendance_tables.sql` - 詳細驗證腳本
- `create_estate_attendance_tables_organized.sql` - 創建表腳本（推薦）
- `create_estate_attendance_tables.sql` - 基本創建腳本

## 🎯 快速操作

**立即檢查：**
1. 打開：https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new
2. 執行：`check_database_tables.sql`
3. 查看結果

**如果表未建立：**
1. 執行：`create_estate_attendance_tables_organized.sql`
2. 驗證：`verify_estate_attendance_tables.sql`
