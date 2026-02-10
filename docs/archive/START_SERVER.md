# 啟動開發伺服器指南

## 🚀 快速啟動

### 方式 1: 使用 npm（推薦）

```bash
npm run dev
```

### 方式 2: 使用 npx

```bash
npx next dev -p 3000
```

## 📋 啟動步驟

### 步驟 1: 檢查依賴

```bash
# 檢查 node_modules 是否存在
ls node_modules

# 如果不存在，安裝依賴
npm install
```

### 步驟 2: 檢查環境變數

確保已設置以下環境變數（在 `.env.local` 文件中）：

```
NEXT_PUBLIC_SUPABASE_URL=https://sqgrnowrcvspxhuudrqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
```

### 步驟 3: 啟動伺服器

```bash
npm run dev
```

### 步驟 4: 訪問網站

等待伺服器啟動完成（通常 10-30 秒），然後在瀏覽器中打開：

- **主頁**: http://localhost:3000
- **簽到頁面**: http://localhost:3000/checkin
- **抽獎轉盤**: http://localhost:3000/lottery
- **後台登入**: http://localhost:3000/admin/login
- **後台管理**: http://localhost:3000/admin/attendance_management

## ⚠️ 常見問題

### 問題 1: 端口 3000 已被佔用

**解決方案：**
```bash
# 查找佔用端口的進程
lsof -ti:3000

# 終止進程
kill -9 $(lsof -ti:3000)

# 或使用其他端口
npm run dev -- -p 3001
```

### 問題 2: 依賴未安裝

**解決方案：**
```bash
npm install
```

### 問題 3: 環境變數未設置

**解決方案：**
創建 `.env.local` 文件並添加環境變數（見步驟 2）

### 問題 4: 資料庫表未建立

**解決方案：**
1. 前往 Supabase SQL Editor
2. 執行 `create_estate_attendance_tables_organized.sql`
3. 驗證表已建立

## 🔍 檢查伺服器狀態

### 檢查端口是否被佔用

```bash
lsof -ti:3000
```

### 檢查進程是否運行

```bash
ps aux | grep "next dev"
```

### 測試伺服器是否響應

```bash
curl http://localhost:3000
```

## 📋 啟動檢查清單

- [ ] 已安裝 Node.js 和 npm
- [ ] 已安裝依賴（`npm install`）
- [ ] 已設置環境變數（`.env.local`）
- [ ] 已建立資料庫表
- [ ] 端口 3000 未被佔用
- [ ] 已執行 `npm run dev`
- [ ] 等待 10-30 秒讓伺服器啟動
- [ ] 已在瀏覽器中訪問 http://localhost:3000

## 🛑 停止伺服器

在終端中按 `Ctrl+C` 停止開發伺服器。
