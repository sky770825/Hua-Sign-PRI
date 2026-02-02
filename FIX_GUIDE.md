# 🔧 修復指南

## 📋 問題診斷

### 1. 頁面顯示不出來

**可能原因：**
- 伺服器沒有運行
- 建置快取損壞
- 模組載入錯誤

**解決方法：**

```bash
# 1. 停止舊的伺服器
pkill -f "next dev"

# 2. 清理建置快取
rm -rf .next

# 3. 重新建置
npm run build

# 4. 啟動開發伺服器
npm run dev
```

### 2. 資料匯入失敗

**可能原因：**
- 資料庫表尚未建立
- 資料格式錯誤
- 網路連線問題

**解決方法：**

#### 步驟 1：檢查資料庫表

1. 前往後台頁面：`http://localhost:3000/admin/attendance_management`
2. 點擊「檢查資料庫」按鈕
3. 查看哪些表不存在

#### 步驟 2：建立資料庫表

**方法 A：使用後台功能（推薦）**

1. 點擊「檢查資料庫」按鈕
2. 如果表不存在，會顯示 SQL 腳本
3. 複製 SQL 腳本
4. 前往 Supabase Dashboard → SQL Editor
5. 貼上並執行 SQL 腳本

**方法 B：手動執行 SQL**

1. 登入 Supabase Dashboard：https://supabase.com/dashboard
2. 選擇您的專案
3. 打開 SQL Editor
4. 執行以下查詢檢查表是否存在：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'estate_attendance_%'
ORDER BY table_name;
```

5. 如果表不存在，執行 `app/api/database/create/route.ts` 中的 SQL 腳本

#### 步驟 3：驗證表已建立

執行驗證查詢：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'estate_attendance_%'
ORDER BY table_name;
```

**應該看到 5 個表：**
- ✅ `estate_attendance_members` - 會員表
- ✅ `estate_attendance_meetings` - 會議表
- ✅ `estate_attendance_checkins` - 簽到記錄表
- ✅ `estate_attendance_prizes` - 獎品表
- ✅ `estate_attendance_lottery_winners` - 中獎記錄表

### 3. CSV 匯入功能

**使用步驟：**

1. 前往「統計報表」標籤
2. 在「會員出席統計」區域
3. 點擊「📤 匯入 CSV」按鈕（綠色）
4. 選擇 CSV 檔案
5. 系統會自動：
   - 檢查資料庫表是否存在
   - 解析 CSV 數據
   - 創建會議記錄
   - 寫入簽到記錄
   - 顯示匯入結果

**CSV 格式要求：**

標題行必須包含：
- 會員編號（第 1 欄）
- 姓名（第 2 欄）
- 總會議數（第 3 欄）
- 出席次數（第 4 欄）
- 遲到次數（第 5 欄，可選）
- 代理出席（第 6 欄，可選）
- 缺席次數（第 7 欄，可選）

**檔案名稱格式（自動提取日期）：**
- `出席統計_2025-07-18_2026-01-14.csv`
- 系統會自動從檔案名稱提取日期範圍

## 🔍 常見錯誤處理

### 錯誤 1：`Cannot find module './682.js'`

**原因：** Next.js 建置快取損壞

**解決：**
```bash
rm -rf .next
npm run build
npm run dev
```

### 錯誤 2：`relation "estate_attendance_xxx" does not exist`

**原因：** 資料庫表尚未建立

**解決：**
1. 執行「檢查資料庫」功能
2. 按照提示建立資料表
3. 重新嘗試匯入

### 錯誤 3：`匯入失敗：資料庫表尚未建立`

**原因：** 匯入前沒有建立資料表

**解決：**
1. 點擊「檢查資料庫」按鈕
2. 建立缺少的資料表
3. 重新匯入 CSV

### 錯誤 4：頁面顯示空白

**原因：** 
- 伺服器沒有運行
- JavaScript 錯誤
- 資料載入失敗

**解決：**
1. 檢查伺服器是否運行：`ps aux | grep "next dev"`
2. 檢查瀏覽器控制台（F12）是否有錯誤
3. 重新啟動伺服器
4. 清理瀏覽器快取

## ✅ 完整檢查清單

- [ ] 伺服器正在運行（`npm run dev`）
- [ ] 資料庫表已建立（5 個表）
- [ ] 可以訪問後台頁面
- [ ] 「檢查資料庫」功能正常
- [ ] CSV 匯入功能正常
- [ ] 資料可以成功寫入資料庫

## 📞 需要幫助？

如果以上方法都無法解決問題，請提供：
1. 瀏覽器控制台錯誤訊息（F12）
2. 伺服器終端錯誤訊息
3. 具體的操作步驟和預期結果
