# 華地產簽到系統狀態報告

## 📋 系統概覽

**專案名稱**: 華地產簽到功能  
**技術棧**: Next.js 16, TypeScript, Supabase, Tailwind CSS  
**部署平台**: Cloudflare Pages / Vercel

## 🔧 當前狀態

### ✅ 已完成的功能

1. **簽到系統**
   - 會員簽到功能 (`app/checkin/`)
   - 簽到記錄管理
   - 日期選擇和統計

2. **管理後台**
   - 管理員登入 (`app/admin/login/`)
   - 出席管理 (`app/admin/attendance_management/`)
   - 會員管理
   - 會議管理

3. **抽獎系統**
   - 幸運轉盤抽獎 (`app/lottery/`)
   - 獎品管理
   - 中獎記錄

4. **API 端點**
   - `/api/checkin` - 簽到相關
   - `/api/checkins` - 簽到記錄查詢
   - `/api/members` - 會員管理
   - `/api/meetings` - 會議管理
   - `/api/prizes` - 獎品管理
   - `/api/lottery` - 抽獎相關

### ⚠️ 待修復的問題

1. **獎品權限問題**（進行中）
   - 錯誤: `permission denied for table estate_attendance_prizes`
   - 狀態: 已修改 API 代碼使用 `supabaseService`
   - 待執行: 在 Supabase 中禁用 RLS 或設置政策

2. **資料庫遷移歷史不匹配**
   - 本地和遠端遷移歷史不一致
   - 影響: 無法使用 `supabase db push`

## 📁 專案結構

```
華地產簽到功能/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理後台
│   ├── api/               # API 路由
│   ├── checkin/           # 簽到頁面
│   ├── lottery/           # 抽獎頁面
│   └── page.tsx           # 首頁
├── lib/                    # 工具庫
│   ├── supabase.ts        # Supabase 客戶端
│   ├── api-utils.ts       # API 工具
│   └── validation.ts      # 驗證工具
├── supabase/               # Supabase 配置
│   └── migrations/        # 資料庫遷移
└── scripts/               # 自動化腳本
```

## 🔑 環境變數

### 必需環境變數

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名 Key
- `SUPABASE_SERVICE_KEY` - Supabase 服務端 Key（用於繞過 RLS）

### 環境變數文件

- `.env.local` - 本地開發環境變數（已創建）

## 🗄️ 資料庫結構

### 核心表（estate_attendance_ 前綴）

1. `estate_attendance_members` - 會員資料
2. `estate_attendance_meetings` - 會議資料
3. `estate_attendance_checkins` - 簽到記錄
4. `estate_attendance_prizes` - 獎品資料
5. `estate_attendance_lottery_winners` - 中獎記錄

## 🚀 啟動開發伺服器

```bash
npm run dev
```

伺服器將在 `http://localhost:3000` 啟動

## 📋 待辦事項

- [ ] 修復獎品權限問題（執行 SQL 禁用 RLS）
- [ ] 測試所有功能是否正常
- [ ] 修復資料庫遷移歷史
- [ ] 部署到生產環境

## 🔗 相關連結

- **Supabase Dashboard**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc
- **SQL Editor**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new
- **API Keys**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api

## 📝 修復指南

### 修復獎品權限問題

1. 在 Supabase SQL Editor 中執行：
   ```sql
   -- 刪除所有現有政策
   DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
   DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
   DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
   DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;
   
   -- 禁用 RLS
   ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
   ```

2. 重新啟動開發伺服器：
   ```bash
   npm run dev
   ```

3. 測試新增獎品功能
