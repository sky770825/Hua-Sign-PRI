# 連動與同步／刷新說明

## 一、資料連動關係

| 來源 | 影響範圍 | 說明 |
|------|----------|------|
| **會議 (meetings)** | 簽到頁「今日會議／今日無例會」、簽到 API 是否接受 | 簽到頁以 `GET /api/checkins?date=今天` 取得當日會議；無伺服器端快取，每次皆查 DB。 |
| **會員 (members)** | 簽到頁名單、抽獎名單、後台出席管理 | 後台增刪改會員會 `clearCacheByPrefix(CacheKeys.MEMBERS)`；簽到頁請求已改為 `cache: 'no-store'`，不依賴瀏覽器快取。 |
| **簽到 (checkins)** | 簽到列表、抽獎池（7:00 前簽到才進池） | 僅寫入 DB，無額外快取。抽獎時由 `/api/lottery/draw` 依當下 DB 計算可抽名單。 |
| **Google Sheets** | 會員名單可選同步至試算表 | 後台「同步到 Google Sheets」呼叫 `POST /api/sync/sheets`；會員新增/編輯/刪除時也會非同步寫入 Sheets（若已設定）。 |

- **會議快取**：`GET /api/meetings` 使用伺服器記憶體快取（TTL 5 分鐘）；建立/更新會議時會 `clearCacheByPrefix('meetings:')`，下次 GET 即為新資料。
- **簽到頁關鍵**：能否簽到由 `GET /api/checkins?date=今天` 的 `meeting` 決定，此 API 未使用 withCache，且已加上 `Cache-Control: no-store`，並由前端配合防快取與刷新（見下）。

## 二、例會當天「時間一到就可簽到」的刷新策略

為避免因快取或未刷新而導致 6:30 後仍顯示「今日無例會」或無法簽到，已做以下處理：

1. **前端不緩存關鍵請求**
   - 簽到頁所有 `loadData` 內請求：`/api/members`、`/api/checkins?date=...`、`/api/meetings` 皆加上 `cache: 'no-store'`。
   - `checkins` 請求並加上查參 `_t=${Date.now()}`，避免瀏覽器或代理使用舊回應。

2. **後端不讓 CDN/瀏覽器緩存簽到結果**
   - `GET /api/checkins` 回應加上 `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`、`Pragma: no-cache`。

3. **定時刷新**
   - 簽到頁每 **20 秒** 自動呼叫一次 `loadData()`，確保跨日或例會 6:30 後在約 20 秒內會更新會議狀態與簽到列表。

4. **分頁重新可見時立即刷新**
   - 監聽 `visibilitychange`：當使用者從其他分頁切回簽到頁時，立即執行一次 `loadData()`，避免「昨晚開著分頁，今早 6:35 才切回來」仍顯示舊狀態。

效果摘要：
- 例會當天 6:30 一到，至多約 20 秒內會顯示「今日會議」並可簽到；若剛好切回分頁會立刻刷新。
- 跨日（例如 0:00 後）最多 20 秒內會從「今日無例會」更新為當日正確狀態。

## 三、可選後續檢查

- 若部署於 CDN（如 Vercel Edge），確認 `GET /api/checkins` 的 `Cache-Control` 未被覆寫。
- 會員名單若希望簽到頁「幾乎即時」反映後台變更，目前 20 秒輪詢 + 可見性刷新已可涵蓋；必要時可再縮短輪詢間隔或對「會員列表」單獨做可見性刷新。
