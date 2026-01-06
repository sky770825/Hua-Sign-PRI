# 華地產線上鑽石分會簽到系統

## 專案簡介

這是一個專為華地產線上鑽石分會設計的簽到管理系統，包含前端簽到、後台管理、抽獎轉盤等功能。

## 功能特色

- ✅ 前端簽到功能（無需密碼）
- ✅ 後台管理系統（完整 CRUD 功能）
- ✅ 會議管理（自動限制為週四）
- ✅ 抽獎轉盤功能
- ✅ 獎品管理
- ✅ 數據統計與報表
- ✅ CSV 匯入/匯出
- ✅ 資料庫備份/還原

## 技術棧

- **框架**: Next.js 14
- **資料庫**: Insforge PostgreSQL（雲端）
- **儲存**: Insforge Storage（雲端）
- **樣式**: Tailwind CSS
- **語言**: TypeScript

## 快速開始

### 開發環境

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問 http://localhost:3000
```

### 生產環境部署

```bash
# 構建專案
npm run build

# 啟動生產服務器
npm start
```

## 資料庫

- **類型**: Insforge PostgreSQL（雲端）
- **位置**: Insforge 雲端資料庫
- **備份**: Insforge 自動備份

## 部署

### GitHub + Vercel（推薦）

1. 推送到 GitHub
2. 在 [Vercel](https://vercel.com) 導入專案
3. 自動部署完成

詳見 [GITHUB_DEPLOYMENT.md](./GITHUB_DEPLOYMENT.md)

## 部署注意事項

詳見 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 開發團隊

**華地產資訊長 蔡濬瑒**

## 授權

私有專案
