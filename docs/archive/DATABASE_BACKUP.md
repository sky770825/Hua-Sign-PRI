# Supabase 資料庫存檔說明

## ✅ 現有的資料庫存檔文件

### 1. 資料庫結構定義文件

#### `create_estate_attendance_tables.sql`
- **用途**：創建所有資料表的 SQL 腳本
- **包含**：5 個主要表的結構定義
- **位置**：專案根目錄

#### `create_estate_attendance_tables_organized.sql`
- **用途**：組織化的資料表創建腳本
- **包含**：完整的表結構和約束
- **位置**：專案根目錄

#### `verify_estate_attendance_tables.sql`
- **用途**：驗證資料表是否正確建立
- **包含**：檢查表結構、外鍵、索引等
- **位置**：專案根目錄

### 2. API 路由中的資料庫創建邏輯

#### `app/api/database/create/route.ts`
- **用途**：通過 API 動態創建資料表
- **包含**：所有表的 CREATE TABLE 語句
- **位置**：`app/api/database/create/route.ts`

### 3. 資料導入腳本

#### `import_members_auto.sql`
- **用途**：自動導入會員資料

#### `import_members_from_sheets.sql`
- **用途**：從 Google Sheets 導入會員資料

## 📋 資料庫結構

### 主要資料表（5 個）

1. **estate_attendance_members** - 會員表
2. **estate_attendance_meetings** - 會議表
3. **estate_attendance_checkins** - 簽到記錄表
4. **estate_attendance_prizes** - 獎品表
5. **estate_attendance_lottery_winners** - 中獎記錄表

## 🔍 如何檢查資料庫存檔

### 方法 1: 查看 SQL 文件

```bash
# 查看創建表的 SQL
cat create_estate_attendance_tables.sql

# 查看驗證 SQL
cat verify_estate_attendance_tables.sql
```

### 方法 2: 在 Supabase Dashboard 中查看

1. 登入 Supabase Dashboard
2. 前往 SQL Editor
3. 執行 `verify_estate_attendance_tables.sql`
4. 查看所有表的結構和數據

### 方法 3: 使用 API 檢查

```bash
# 檢查表是否存在
curl https://您的網站/api/database/create
```

## ⚠️ 缺少的存檔

### 目前缺少：

1. **完整的資料庫備份腳本**
   - 包含所有表結構
   - 包含所有數據（可選）
   - 包含索引、觸發器等

2. **遷移文件**
   - 版本化的遷移腳本
   - 升級/降級腳本

3. **資料導出腳本**
   - 導出所有數據為 SQL
   - 導出為 CSV

## ✅ 建議創建的存檔

### 1. 完整的資料庫備份腳本

包含：
- 所有表的 CREATE TABLE 語句
- 所有索引
- 所有觸發器
- 所有函數
- 所有視圖
- RLS 政策

### 2. 資料導出腳本

包含：
- 導出所有數據為 SQL INSERT 語句
- 導出為 CSV 格式

### 3. 遷移文件

包含：
- 版本化的遷移腳本
- 升級腳本
- 降級腳本

## 🔗 相關文件

- `create_estate_attendance_tables.sql` - 創建表結構
- `verify_estate_attendance_tables.sql` - 驗證表結構
- `app/api/database/create/route.ts` - API 創建表邏輯
