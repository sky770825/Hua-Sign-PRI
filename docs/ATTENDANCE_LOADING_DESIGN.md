# 出席管理與統計報表 — 整體設計與多種實作方式

本文從「統計報表可選日期區間」與「整體功能周延性」出發，整理多種設計方式與建議。

---

## 一、系統功能總覽

| 模組 | 功能要點 | 資料來源 |
|------|----------|----------|
| **簽到頁** | 單日簽到、狀態、留言 | checkins + members + meetings |
| **抽獎頁** | 轉盤、抽獎、中獎名單、刪除中獎 | checkins + members + prizes + lottery_winners |
| **出席管理** | 選日期、單日簽到列表、批量簽到/刪除、會議列表、每場人數 | members + meetings + checkins |
| **統計報表** | 總會議數、每人出席/遲到/代理/缺席/出席率、排序、匯入/分析 CSV | 同上 + 需支援**日期區間** |
| **獎品／會議／會員** | CRUD、列表 | prizes, meetings, members |
| **備份／還原** | 資料庫備份與還原 | 全表 |

統計報表是「跨日期」的彙總，適合支援**指定區間**（從某日到某日），其餘多為單日或列表操作。

---

## 二、統計報表：日期區間設計

### 2.1 行為定義

- **總會議數**：在選定區間內，有至少一筆簽到的會議日期數（仍以簽到記錄為準）。
- **每人出席／遲到／代理／缺席／出席率**：只計算區間內的會議與簽到；同一會員同一日只計一次。

### 2.2 前端介面

- **區間選擇**（二擇一或並存）：
  - **快捷**：本週、本月、近三個月、本年度、全部。
  - **自訂**：開始日期 + 結束日期（date picker 或輸入 YYYY-MM-DD）。
- **預設**：例如「全部」或「近三個月」，可由設定或 URL 參數決定。
- **查詢**：選好區間後按「查詢」或切換區間時自動請求；顯示「統計區間：YYYY-MM-DD ~ YYYY-MM-DD」。

### 2.3 API 設計

- **現有**：`GET /api/statistics/member-attendance`（無參數，全期間）。
- **擴充**：支援 query 參數，例如  
  `GET /api/statistics/member-attendance?start=2025-01-01&end=2025-12-31`  
  - 若未帶 `start`/`end`，維持現有「全期間」行為。
  - 後端：只取 `meeting_date >= start AND meeting_date <= end` 的簽到，再算 distinct 會議數與每人統計。

### 2.4 與「出席管理」的關係

- 出席管理：偏重**單日操作**與**會議列表**，可繼續用「全期間或預設區間」的 context 或 checkins-by-date。
- 統計報表：偏重**區間查詢**，建議**獨立打** member-attendance（帶 start/end），不與「全期間 context」綁死，這樣區間切換時邏輯清晰、資料正確。

---

## 三、資料載入：多種設計方式

### 方式 1：單一「頁面情境 API」（整頁一次拿）

- **API**：`GET /api/attendance/context`（可選 `?date=YYYY-MM-DD` 表示當日焦點）。
- **回傳**：members, meetings, checkinsByDate, meetingStats, memberAttendanceStats（全期間或固定區間）。
- **前端**：進入出席管理頁只打 1 次；當日簽到用 `checkinsByDate[date]`；統計報表若不做區間，可直接用 context 的 memberAttendanceStats。
- **優點**：請求最少、延遲低、統計口徑單一。
- **缺點**：統計若要做「可選區間」，需另打 member-attendance（帶 start/end），或改為 context 也支援 start/end（見下方方式 3）。

### 方式 2：按需分開打 + 快取

- **出席管理**：members + meetings + checkins-by-date（或 + checkins 當日）；當日簽到從 byDate 取。
- **統計報表**：切到 tab 時打 member-attendance（無參數或帶 start/end）；用 React Query / SWR 快取，同一區間不重打。
- **優點**：實作單純、統計區間易擴充。
- **缺點**：請求數較多，需處理 loading 與快取失效。

### 方式 3：情境 API + 統計區間分離（推薦）

- **情境 API**：`GET /api/attendance/context` 只負責「出席管理」所需：members, meetings, checkinsByDate, meetingStats；**不帶** memberAttendanceStats，或只帶「全期間」一份供預設顯示。
- **統計報表**：一律打 `GET /api/statistics/member-attendance?start=...&end=...`；區間由使用者選擇；首次可預設 start/end（例如近三個月）。
- **優點**：出席管理 1 次請求；統計報表口徑單一、區間彈性大；前後端職責清楚。

### 方式 4：統計專用「區間情境 API」

- **API**：`GET /api/statistics/attendance-report?start=...&end=...`  
  回傳：totalMeetings, memberStats, 可選 dates[]（區間內有簽到的日期列表）。
- **前端**：統計報表頁只打這支；換區間就換參數重打。
- **優點**：報表與「出席管理」完全解耦，未來可加欄位（例如依專業別彙總）不影響其他頁。

### 方式 5：前後端分工（前端算統計）

- **後端**：只提供 checkins-by-date（或 checkins 依 date 查詢），不提供 member-attendance。
- **前端**：依選定區間篩選 checkinsByDate，在瀏覽器算總會議數與每人統計。
- **優點**：後端簡單、換區間不必再請求。
- **缺點**：資料量大時效能與記憶體壓力大、邏輯要與後端一致（易出錯），不建議資料量大的情境。

---

## 四、整體功能周延性清單

### 4.1 統計報表

- [ ] **日期區間**：開始日、結束日；快捷（本週/本月/近三月/本年度/全部）。
- [ ] **總會議數**：區間內「有簽到的日期」數。
- [ ] **每人統計**：出席、遲到、代理、缺席、出席率（區間內、每人每日只計一次）。
- [ ] **排序**：依出席率、出席次數、缺席等。
- [ ] **匯出**：依目前區間匯出 CSV/Excel（可選）。
- [ ] **與 CSV 匯入/分析**：匯入後可選「重新統計本區間」或「全期間」以更新畫面。

### 4.2 出席管理

- [ ] **單日簽到**：選日期、列表、狀態、批量簽到/刪除。
- [ ] **會議列表**：每場簽到數、可選只看「有簽到的會議」或全部。
- [ ] **載入**：最少請求（情境 API 或 checkins-by-date）、skeleton/局部 loading。
- [ ] **錯誤**：單一 API 失敗不拖垮整頁、可重試或 fallback。

### 4.3 簽到頁／抽獎頁

- [ ] **依「會議日期」**：簽到與抽獎皆綁定同一會議日，避免用錯日。
- [ ] **抽獎**：已中獎不重複、獎品數量一致、中獎名單可刪除（已有）。

### 4.4 資料一致性

- [ ] **統計口徑**：全系統「總會議數／出席」只在一處定義（建議在 member-attendance API）；前端不重複實作一套。
- [ ] **時區**：日期一律用 YYYY-MM-DD（或明確 UTC+8 儲存），避免跨日錯誤。

### 4.5 效能與體驗

- [ ] **大量會員**：統計表可考慮虛擬捲動或分頁，避免一次渲染過多列。
- [ ] **大量日期**：checkins-by-date 若過大，可考慮後端分頁或「只回傳有簽到的日期」清單 + 按需拉取明細（進階）。

---

## 五、API 設計整理（建議）

| API | 用途 | 參數建議 | 說明 |
|-----|------|----------|------|
| `GET /api/attendance/context` | 出席管理整頁 | 可選 `?date=YYYY-MM-DD` | members, meetings, checkinsByDate, meetingStats；可不含 memberAttendanceStats |
| `GET /api/statistics/member-attendance` | 統計報表 | `start`, `end`（可選） | 區間內 totalMeetings + memberStats；無參數＝全期間 |
| `GET /api/statistics/checkins-by-date` | 依日期簽到 | 無 | 現有；供 context 或單獨使用 |
| `GET /api/checkins?date=...` | 單日簽到明細 | `date` | 現有；可與 context 並存，或僅在「手動刷新當日」時用 |

---

## 六、實作順序建議

1. **統計報表日期區間**
   - 後端：`member-attendance` 支援 `start`、`end`；篩選簽到後再算。
   - 前端：統計報表區塊加「開始日期／結束日期」與快捷；選好後打 API 並顯示區間說明。
2. **出席管理載入優化**
   - 後端：實作 `GET /api/attendance/context`（members, meetings, checkinsByDate, meetingStats）。
   - 前端：loadData 改為只打 context；當日簽到從 checkinsByDate 取。
3. **統計報表與 context 分離**
   - 統計報表一律用 member-attendance（帶區間）；不再依賴 context 的 memberStats，避免區間不一致。
4. **體驗**
   - 載入 skeleton、錯誤提示與重試；統計表過長時可加分頁或虛擬捲動。

---

## 七、整體功能與模組關係

### 7.1 模組依賴（概念）

```
簽到頁 ──────► checkins, members, meetings（單日）
抽獎頁 ──────► checkins, members, prizes, lottery_winners（單日/當次會議）
出席管理 ───► members, meetings, checkins（多日列表 + 單日操作）
統計報表 ───► 同上 + 區間篩選（start ~ end）
```

- **簽到／抽獎**：以「單一會議日」為主，資料量小，現有 API 即可。
- **出席管理**：需要「多日簽到彙總」做列表與每場人數，適合情境 API 或 checkins-by-date。
- **統計報表**：跨日彙總、需區間，適合獨立 API 帶 start/end。

### 7.2 其他可行做法（擴充）

- **匯出依區間**：統計報表選好區間後，提供「匯出本區間 CSV」；後端可新增 `GET /api/statistics/export?start=...&end=...` 或由前端用現有 member-attendance 資料組 CSV。
- **會議列表篩選**：出席管理左側「會議列表」可選「全部／僅有簽到的日期」；資料仍來自 context 的 meetings + checkinsByDate。
- **快取策略**：members、meetings 變動少，可用短期 cache（如 1 分鐘）；checkins-by-date 與 member-attendance 建議 no-cache 或短 TTL，避免看到舊資料。
- **離線／PWA**：若未來要做離線簽到，可考慮 Service Worker + IndexedDB 快取當日 members/meetings，上線後再同步 checkins。
- **權限**：統計報表、匯出、刪除中獎等可依登入角色限制（與現有 admin 登入一致即可）。

### 7.3 邊界與錯誤

- **區間無資料**：start～end 內無簽到時，totalMeetings=0，memberStats 仍回傳所有會員（出席=0）。
- **區間過大**：若資料量極大，可限制區間上限（例如 1 年）或後端分頁；多數情境 1 年內簽到筆數可一次回傳。
- **單一 API 失敗**：情境 API 失敗時，可 fallback 只打 members + meetings，或顯示錯誤 + 重試，不讓整頁白屏。

---

## 八、小結

- **統計報表**：建議支援**指定日期區間**（開始～結束）與快捷（本週/本月/近三月/本年度/全部）；API 用 `member-attendance?start=...&end=...`，口徑單一。
- **出席管理**：建議用**單一情境 API** 減少請求；當日簽到與會議列表來自同一份資料。
- **整體**：統計「區間查詢」與出席「整頁情境」分開設計，再搭配上述 API 分工；匯出、篩選、快取、錯誤處理可依需求逐步補齊。
- **實作**：可先做「member-attendance 支援 start/end」與「統計報表 UI 區間選擇」，再做「context API + 出席管理改為只打 context」。
