# 自動化測試指南

## 🧪 測試腳本說明

本專案提供了多個自動化測試腳本，用於檢查系統的各個方面。

### 快速開始

```bash
# 運行所有測試
npm run test

# 或直接執行
bash scripts/test-all.sh
```

## 📋 可用的測試腳本

### 1. 全面測試 (`test-all.sh`)

**功能：**
- 檢查伺服器狀態
- 測試所有前端頁面
- 測試所有 API 端點
- 檢查資料庫連接
- 驗證環境變數
- 測試構建
- 檢查依賴

**使用方法：**
```bash
npm run test
# 或
bash scripts/test-all.sh
```

**輸出示例：**
```
🧪 開始自動化測試...
測試目標: http://localhost:3000

📡 步驟 1: 檢查伺服器狀態...
✅ 伺服器正在運行

🌐 步驟 2: 測試前端頁面...
✅ 主頁 - HTTP 200
✅ 簽到頁面 - HTTP 200
...

📊 測試總結
總測試數: 16
通過: 16
失敗: 0
🎉 所有測試通過！
```

### 2. API 測試 (`test-api.sh`)

**功能：**
- 詳細測試每個 API 端點
- 檢查 JSON 響應格式
- 顯示響應內容

**使用方法：**
```bash
npm run test:api
# 或
bash scripts/test-api.sh
```

### 3. 前端測試 (`test-frontend.sh`)

**功能：**
- 測試所有前端頁面
- 檢查頁面可訪問性
- 驗證 HTML 格式
- 檢查 Next.js 標記

**使用方法：**
```bash
npm run test:frontend
# 或
bash scripts/test-frontend.sh
```

### 4. 資料庫測試 (`test-database.sh`)

**功能：**
- 測試資料庫連接
- 檢查各個資料表
- 驗證數據格式
- 顯示記錄數量

**使用方法：**
```bash
npm run test:database
# 或
bash scripts/test-database.sh
```

### 5. 測試報告 (`test-report.sh`)

**功能：**
- 生成詳細的測試報告
- 保存到文件
- 包含系統資訊

**使用方法：**
```bash
bash scripts/test-report.sh
```

報告會保存到 `test-report-YYYYMMDD-HHMMSS.txt`

## ⚙️ 配置

### 自定義測試 URL

預設測試 `http://localhost:3000`，可以通過環境變數修改：

```bash
BASE_URL=http://your-server.com npm run test
```

### 測試不同的環境

```bash
# 測試本地開發環境
BASE_URL=http://localhost:3000 npm run test

# 測試生產環境
BASE_URL=https://your-domain.com npm run test

# 測試 Cloudflare Pages
BASE_URL=https://hua-sign-pri.pages.dev npm run test
```

## 📊 測試覆蓋範圍

### 前端頁面
- ✅ 主頁 (`/`)
- ✅ 簽到頁面 (`/checkin`)
- ✅ 幸運轉盤 (`/lottery`)
- ✅ 管理後台登入 (`/admin/login`)
- ✅ 管理後台 (`/admin/attendance_management`)

### API 端點
- ✅ 會員 API (`/api/members`)
- ✅ 會議 API (`/api/meetings`)
- ✅ 簽到 API (`/api/checkins`)
- ✅ 獎品 API (`/api/prizes`)
- ✅ 統計 API (`/api/statistics/member-attendance`)
- ✅ 抽獎 API (`/api/lottery/winners`)
- ✅ 匯入檢查 API (`/api/statistics/check`)

### 資料庫
- ✅ 會員表連接
- ✅ 會議表連接
- ✅ 簽到表連接
- ✅ 獎品表連接
- ✅ 統計數據查詢

### 系統檢查
- ✅ 伺服器運行狀態
- ✅ 構建成功性
- ✅ 依賴完整性
- ✅ 環境變數配置

## 🔧 故障排除

### 問題：測試失敗 - 伺服器未運行

**解決方法：**
```bash
# 啟動開發伺服器
npm run dev

# 在另一個終端運行測試
npm run test
```

### 問題：API 測試失敗 - 無響應

**可能原因：**
1. 伺服器未啟動
2. 端口被占用
3. 防火牆阻擋

**解決方法：**
```bash
# 檢查伺服器是否運行
curl http://localhost:3000

# 檢查端口
lsof -i :3000
```

### 問題：資料庫連接失敗

**可能原因：**
1. Supabase 環境變數未設置
2. 網路連接問題
3. Supabase 服務不可用

**解決方法：**
```bash
# 檢查環境變數
echo $NEXT_PUBLIC_SUPABASE_URL

# 測試 Supabase 連接
curl https://sqgrnowrcvspxhuudrqc.supabase.co
```

## 📈 持續集成

### GitHub Actions

可以在 GitHub Actions 中使用這些測試腳本：

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: sleep 10
      - run: npm run test
```

## 📝 測試最佳實踐

1. **在部署前運行測試**
   ```bash
   npm run test && npm run build
   ```

2. **定期運行測試**
   - 每次代碼更改後
   - 部署前
   - 定期（每日/每週）

3. **檢查測試報告**
   - 查看失敗的測試
   - 分析錯誤原因
   - 修復問題後重新測試

4. **測試不同環境**
   - 本地開發環境
   - 預發布環境
   - 生產環境

## 🎯 測試目標

- ✅ 確保所有頁面可訪問
- ✅ 驗證 API 正常運作
- ✅ 檢查資料庫連接
- ✅ 確認構建成功
- ✅ 驗證系統完整性

## 📚 相關資源

- [Next.js 測試文檔](https://nextjs.org/docs/testing)
- [API 測試最佳實踐](https://www.postman.com/api-platform/api-testing/)
- [自動化測試指南](https://www.atlassian.com/continuous-delivery/software-testing/automated-testing)
