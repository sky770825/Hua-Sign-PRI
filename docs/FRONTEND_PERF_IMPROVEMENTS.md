# 前端效能優化：卡頓點與改造方式

## 一、找到的卡頓點

| 位置 | 問題 | 影響 |
|------|------|------|
| **出席管理頁** | 統計報表表格在每次 render 時執行 `members.map` + `rows.sort(cmp)`（IIFE） | 會員數 100+ 時每次切換/重繪都重算，主執行緒卡頓 |
| **出席管理頁** | `filteredMembers` / `sortedFilteredMembers` 內用 `getCheckinStatus(member.id)`，每次為 `checkins.find(...)`，filter 與 sort 共 O(n²) | 會員與簽到多時篩選/排序延遲明顯 |
| **出席管理頁** | 會議歷史區塊在 render 中 `meetings.sort(...).slice(0,10)`，且 `.sort()` 會改寫原陣列 | 每次 render 都排序，且可能造成 React 狀態汙染 |
| **出席管理頁** | CSV 分析：`lines.slice(1).map(parseCSVLine).filter(...)` 一次跑完，大檔（數千行）時主執行緒長時間佔用 | 解析期間 UI 凍結、無進度感 |
| **長列表** | 統計報表、出席名單一次渲染全部列（無虛擬化） | 會員數 200+ 時 DOM 過多、捲動與重繪變慢 |

---

## 二、改造方式與前後差異

### 1. 統計報表表格：map+sort 改為 useMemo（sortedStatsRows）

- **改法**：將「會員 → 統計列 → 依欄位排序」抽成 `sortedStatsRows`，依賴 `[members, memberAttendanceStats, statsSortBy, statsSortOrder]`，用 `useMemo` 計算；表格只做 `sortedStatsRows.map(...)`。
- **前**：每次該區塊 re-render 都跑一次 `members.map` + `rows.sort`。
- **後**：僅在依賴變更時重算；其餘 render 直接使用快取。
- **量測**（開發環境）：  
  - 改前：每次切換到統計報表或改排序，可看到主執行緒耗時（可加 `console.time('statsTable')` 包住原 IIFE）。  
  - 改後：`[perf] sortedStatsRows` 僅在依賴變時出現，耗時約 0.x～2 ms（視會員數而定）。

### 2. 篩選/排序出席名單：checkinMap + useMemo（filteredMembers / sortedFilteredMembers）

- **改法**：  
  - 新增 `checkinMap = useMemo(() => new Map(checkins.map(c => [c.member_id, c])), [checkins])`，O(n) 建表、O(1) 查詢。  
  - `filteredMembers` / `sortedFilteredMembers` 內改為 `checkinMap.get(member.id)`，不再呼叫 `getCheckinStatus`（不再對每個會員做 `checkins.find`）。
- **前**：filter 時每人一次 find → O(n×m)；sort 時每比較兩次 find → 再乘上 sort 比較次數，整體 O(n²) 級。
- **後**：建表 O(n)，filter O(n)，sort 比較 O(1) 查表，整體 O(n log n)。
- **量測**：  
  - 改前：`[perf] filteredMembers` / `sortedFilteredMembers` 在會員與簽到多時可達數十 ms。  
  - 改後：`checkinMap` 約 0.x ms，`filteredMembers` / `sortedFilteredMembers` 明顯縮短（例如 1～5 ms），且僅在依賴變時執行。

### 3. 會議歷史：sort + slice 改為 useMemo（sortedMeetingsTop10）

- **改法**：`sortedMeetingsTop10 = useMemo(() => [...meetings].sort(...).slice(0, 10), [meetings])`，表格改為 `sortedMeetingsTop10.map(...)`。並使用 `[...meetings]` 避免改寫原 state。
- **前**：每次 render 都 `meetings.sort(...)`，且會 mutate 原陣列。
- **後**：僅 `meetings` 變更時重算，且不汙染 state。
- **量測**：會議筆數通常不多，耗時差異小，但可避免多餘排序與潛在 bug。

### 4. CSV 分析：分塊解析（requestIdleCallback + processInChunks）

- **改法**：使用 `lib/perf.ts` 的 `processInChunks`，將 `lines.slice(1)` 以每 200 行為一塊解析（parseCSVLine + filter），塊與塊之間用 `requestIdleCallback` 讓出主執行緒；可選 `onProgress` 更新 toast（例如每 500 行或完成時）。
- **前**：數千行一次 `map(parseCSVLine).filter(...)`，主執行緒連續佔用數百 ms。
- **後**：解析分成多個小段，中間可處理輸入與動畫，並有進度提示。
- **量測**：  
  - 改前：大檔（例如 3000 行）`console.time('CSV')` 可能 200～500 ms 一次跑完。  
  - 改後：`[perf] CSV parse rows (analyze)` 總時間可能略增（因 idle 讓出），但主執行緒最長連續佔用顯著下降（例如每段 < 20 ms），並可看到「解析 CSV：500/3000 行」等進度。

### 5. 效能計時與工具（lib/perf.ts）

- **新增**：  
  - `perfStart(label)` / `perfEnd(label)`：開發環境下使用 `performance.mark/measure` 與 `console.time/timeEnd`。  
  - `processInChunks(items, chunkSize, processChunk, onProgress)`：分塊處理陣列，塊間用 `requestIdleCallback`（或 fallback `setTimeout(0)`）。  
  - `runWhenIdle(cb)`：在閒置時執行，避免阻塞關鍵路徑。
- **使用處**：  
  - `checkinMap`、`filteredMembers`、`sortedFilteredMembers`、`sortedStatsRows`、CSV 解析處可包上 `perfStart`/`perfEnd`，方便在開發時對比改前改後。

### 6. 虛擬清單（未使用）

- **現狀**：報表「出缺勤會議記錄表」改回單一 `<table>` 全部渲染，與資料庫匯入資料一致，不使用 react-window 虛擬清單。
- **原因**：虛擬清單曾導致報表版面/資料顯示異常；目前以 useMemo 優化排序與建表即可。

---

## 三、量測方式摘要（console.time / 指標）

- **開發環境**：在瀏覽器 Console 看 `[perf] xxx` 的 time/timeEnd 輸出；必要時在 React DevTools 或 Performance 錄製比對改前改後。
- **關鍵標記**：  
  - `checkinMap`：建表時間。  
  - `filteredMembers`：篩選時間。  
  - `sortedFilteredMembers`：排序時間。  
  - `sortedStatsRows`：統計表建表+排序時間。  
  - `CSV parse rows (analyze)`：CSV 分塊解析總時間（與主執行緒最長連續佔用不同，後者需看 Performance 火焰圖）。
- **簡單對比**：  
  - 改前：在對應位置手動加 `console.time('label')` / `console.timeEnd('label')` 測一次。  
  - 改後：開啟開發模式，操作同一情境（例如切換統計報表、改排序、上傳大 CSV），看上述 `[perf]` 數值與體感卡頓是否減輕。

### 前後指標對照（參考值，依資料量與裝置而異）

| 情境 | 改前（約略） | 改後（約略） |
|------|--------------|--------------|
| 統計表建表+排序（100 會員） | 每次 re-render 數 ms～十數 ms | 僅依賴變更時，`[perf] sortedStatsRows` 約 0.5～2 ms |
| 篩選/排序出席名單（100 會員、50 簽到） | `filteredMembers` + `sortedFilteredMembers` 合計可達 20～50 ms | `checkinMap` 約 0.x ms，篩選/排序各約 1～5 ms |
| CSV 解析（3000 行） | 單次主執行緒 200～500 ms，UI 凍結 | `[perf] CSV parse rows (analyze)` 總時間略增，但單段 < 20 ms，可顯示進度 |
| 統計表 DOM（200 列） | 約 200 個 `<tr>` | 維持全部渲染（未使用虛擬清單） |

---

## 四、檔案變更一覽

| 檔案 | 變更 |
|------|------|
| `lib/perf.ts` | 新增：perfStart/perfEnd、processInChunks、runWhenIdle |
| `app/admin/attendance_management/page.tsx` | checkinMap useMemo；filteredMembers/sortedFilteredMembers 改用 checkinMap + perf；sortedStatsRows useMemo；sortedMeetingsTop10 useMemo；統計表改為 map sortedStatsRows；CSV 分析改為 processInChunks；import perf；**未使用虛擬清單**，報表為單一 table 全部渲染 |
| `package.json` | 可選 react-window（目前未用於報表） |
