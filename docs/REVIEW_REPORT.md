# 專案總體檢查報告

## 一、重要但可能遺漏的事項

### 🔴 高優先級

| 項目 | 說明 |
|------|------|
| **後台 API 無認證** | 會議刪除、簽到刪除、抽獎等 API 無需登入即可呼叫，任何人知道 URL 可操作 |
| **登入狀態可偽造** | 設 `localStorage.adminLoggedIn = 'true'` 即可進入後台 |
| **ADMIN_PASSWORD 預設 h123** | 未設定時密碼為 h123，部署務必修改 |
| **SUPABASE_SERVICE_KEY 格式** | 必須是 JWT（eyJ...），不能用 sbp_ 的 CLI token |

### 🟡 中優先級

| 項目 | 說明 |
|------|------|
| **兩套時間常數** | 簽到用 `checkin-times.ts`，抽獎用 `lottery-deadline.ts`，修改時需同步檢查 |
| **後台系統參數無效** | 會議室開放／遲到門檻等存在 localStorage，不影響 API，實際以 `checkin-times.ts` 為準 |
| **測試腳本會改資料** | `test-lottery-full-with-cleanup.mjs`、`delete-meeting-by-date.mjs` 會變更 DB |
| **備份** | 建議定期備份 Supabase，專案有 backup 腳本可排程 |

### 🟢 低優先級

| 項目 | 說明 |
|------|------|
| **密碼變更僅限本機** | 後台「變更密碼」只改 localStorage，正式環境請用 Vercel 環境變數 |
| **ES5 相容** | Set/Map 不可直接 spread，需用 `Array.from()` |

---

## 二、延遲與速度評估

### ✅ 已達及格標準的部分

| 項目 | 現狀 | 評估 |
|------|------|------|
| **抽獎頁載入** | 5 個 API 並行請求（Promise.all） | ✓ 良好 |
| **簽到頁** | 會員 + 簽到並行、搜尋有 debounce 300ms | ✓ 及格 |
| **後台 context** | 單一 API 回傳 members + meetings + checkinsByDate | ✓ 減少請求數 |
| **前端優化** | 使用 useMemo、checkinMap 避免 O(n²)、debounce 搜尋 | ✓ 及格 |
| **快取** | members/meetings/prizes 有 TTL 快取 | ✓ 有 |
| **分批查詢** | 簽到超過 1000 筆會分批取得 | ✓ 避免截斷 |
| **速率限制處理** | 遇 429 暫停 5 分鐘、60 秒刷新 | ✓ 有 |

### ⚠️ 需注意／可加強的部分

| 項目 | 現狀 | 問題 | 建議 |
|------|------|------|------|
| **/api/attendance/context** | 無快取、每次打 DB | 簽到筆數多時可能 >1s | 可對 context 做短期快取（30s～1min），或依日期拆分 |
| **context 拉全部簽到** | 分批 1000 筆取得所有簽到 | 簽到 >3000 筆時多次 round-trip | 可考慮僅拉近期 N 個月 |
| **統計 API** | member-attendance、care-list 拉全量簽到 | 資料量大時慢 | 可加日期區間上限或快取 |
| **後台初次載入** | loadData 含 context（可能重） | 首屏可能 1～2 秒 | 可考慮骨架屏或分段載入 |
| **簽到頁** | 會員與簽到非完全並行 | 可再優化 | 改為 Promise.all 一次取得 |
| **圖片** | 多處使用 `<img>` | LCP 可能較慢 | 改用 next/image |

---

## 三、需加強／補強項目清單

### 效能面

1. **簽到頁 loadData**：改為 `Promise.all([members, checkins, meetings])` 並行，減少總等待時間
2. **context API 快取**：加入 30～60 秒短期快取，或提供 `?fresh=1` 強制刷新
3. **統計 API 區間**：member-attendance、care-list 可限制查詢區間（例：最多 1 年）避免超長查詢
4. **圖片優化**：獎品、會員頭像等改用 `next/image`，改善 LCP

### 安全面

5. **API 認證**：管理相關 API（meetings CRUD、checkin delete、lottery draw）加入 session/token 驗證
6. **後台登入**：改用 JWT + HttpOnly Cookie 或 NextAuth，避免 localStorage 偽造
7. **ADMIN_PASSWORD**：部署時必設，且避免使用 h123

### 體驗面

8. **後台載入**：初次載入加骨架屏或 loading 狀態，避免白屏
9. **錯誤提示**：部分 API 錯誤可改成 Toast，而非 alert
10. **離線／網路錯誤**：可加網路狀態偵測與重試提示

### 維運面

11. **監控**：可對關鍵 API 加 response time 監控
12. **備份排程**：將 backup 腳本納入排程（cron 或 Vercel Cron）
13. **日誌**：重要操作（登入、刪除、匯入）記錄日誌供稽核

---

## 四、總結

- **重要遺漏**：主要集中在後台與 API 的認證、密碼與 key 設定
- **延遲與速度**：整體可接受，簽到／抽獎流程已達及格水準，大型資料時 context 與統計 API 有優化空間
- **補強方向**：優先處理 API 認證與登入機制，其次為 context 快取與簽到頁並行載入，長期可再優化圖片與監控
