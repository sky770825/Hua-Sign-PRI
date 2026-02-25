# 專案應注意事項總覽

## 🔐 安全性

### 1. 後台登入僅靠 localStorage
- **現狀**：`adminLoggedIn` 存在 localStorage，API 未驗證
- **風險**：任何人可在開發者工具設 `localStorage.adminLoggedIn = 'true'` 進入後台
- **建議**：正式環境考慮 JWT + HttpOnly Cookie 或 NextAuth

### 2. 管理 API 未受保護
- **現狀**：`/api/meetings`、`/api/checkin/delete`、`/api/lottery/draw` 等皆無需認證
- **風險**：若 URL 被知悉，可被任意呼叫
- **建議**：管理相關 API 加上 token / session 驗證

### 3. 管理員密碼
- **預設**：未設 `ADMIN_PASSWORD` 時為 `h123`
- **必須**：部署時在 Vercel 設定 `ADMIN_PASSWORD`

### 4. _testBypassTime 僅限開發環境
- **現狀**：`NODE_ENV === 'development'` 時，`_testBypassTime` 可繞過簽到／抽獎時間
- **生產**：Vercel 上 `NODE_ENV=production`，此 bypass 無效 ✓

---

## 📦 環境與部署

### 5. 環境變數（Vercel 必設）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`：**必須是 JWT（eyJ...）**，不可用 sbp_ 的 CLI token

### 6. Node 版本
- `engines.node: "20.x"`，Vercel / GitHub Actions 已對應

### 7. 必要檔案（避免 build 失敗）
- `lib/lottery-deadline.ts`
- `lib/checkin-times.ts`
- `.eslintrc.json`（CI lint 需要）

---

## ⏰ 時間與設定

### 8. 兩套時間常數
- **`lib/checkin-times.ts`**：簽到 6:30～8:45、遲到 7:00、獎品區 7:00
- **`lib/lottery-deadline.ts`**：抽獎 6:30～7:00、隔週四 6:30 歸零
- **注意**：修改簽到時間只改 `checkin-times.ts`；抽獎時段在 `lottery-deadline.ts`

### 9. 後台「系統設定」已與 API 同步
- **現狀**：後台「系統設定」的會議室開放／遲到門檻／簽到截止／獎品區截止會寫入 DB（`estate_attendance_system_settings`），簽到 API、抽獎 API 與簽到頁皆讀取此設定
- **預設**：未建表或無儲存過時，使用 `lib/checkin-times.ts` 的預設值
- **建表**：若資料庫尚未有 `estate_attendance_system_settings`，可執行 `supabase/migrations/20260212000000_add_system_settings.sql` 或重新執行「建立資料表」腳本

### 10. 僅週四例會
- 會議建立 API 已限制為週四
- 非週四日期會回傳「目前僅支援週四例會」

---

## 🗄️ 資料與腳本

### 11. 測試腳本會改資料
- `test-lottery-full-with-cleanup.mjs`：會建立／刪除簽到、中獎、會議，並改獎品庫存
- `delete-meeting-by-date.mjs`：會刪除指定日期的會議、簽到、抽獎
- **執行前**：確認日期正確，或先備份

### 12. 腳本需 SUPABASE_SERVICE_KEY
- `scripts/lib/supabase.mjs` 會讀 `.env.local`
- 直接跑腳本前需有正確環境變數

### 13. 備份策略
- 專案有 `scripts/backup-supabase.sh`、`backup_database.sql` 等
- 建議定期手動或排程備份 Supabase

---

## 🔧 程式與相容性

### 14. ES5 相容
- `tsconfig target: "es5"`，`Set`/`Map` 不能直接 spread
- 需用 `Array.from(mySet)` 或 `[...Array.from(mySet)]`

### 15. Lint 警告（不擋 build）
- `react-hooks/exhaustive-deps`
- `@next/next/no-img-element`（建議改用 next/image）

---

## 📋 其他

### 16. cursor自動化指揮官
- `tsconfig` 與 `next.config` 已排除此目錄
- 為獨立工具，不參與主專案 build

### 17. 後台密碼變更僅限本機
- 後台「變更密碼」只更新 localStorage 的 `adminPassword`
- 正式環境密碼請在 Vercel 環境變數設定 `ADMIN_PASSWORD`

### 18. 孤兒日期（有簽到無會議）
- 有簽到但無會議紀錄的日期會顯示在「會議管理」黃色區塊
- 可點「新增會議」補齊
