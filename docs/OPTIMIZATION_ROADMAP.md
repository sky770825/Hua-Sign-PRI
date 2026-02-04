# 優化待辦清單

> 上次更新：2025-02  
> 已完成的效能優化：簽到頁並行、context 快取、統計 API 區間、獎品 next/image

---

## 一、效能優化（剩餘項目）

| 優先級 | 項目 | 說明 | 備註 |
|--------|------|------|------|
| 中 | context 簽到筆數優化 | 目前拉全部簽到，>3000 筆時多次 round-trip | 可改為僅拉近期 N 個月（例：6 個月） |
| 低 | 後台初次載入骨架屏 | loadData 含 context 較重，首屏可能 1～2 秒 | 加 Skeleton / loading UI 改善體感 |
| 低 |  mutation 後清除 context 快取 | 簽到／刪除後可能短暫顯示舊資料 | 在 checkin/delete、checkin POST 成功後呼叫 clearCache |

---

## 二、安全優化

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 高 | 管理 API 認證 | meetings CRUD、checkin delete、lottery draw 等加上 session/token 驗證 |
| 高 | 後台登入機制 | 改為 JWT + HttpOnly Cookie 或 NextAuth，避免 localStorage 偽造 |
| 高 | 部署密碼 | 務必設定 `ADMIN_PASSWORD`，避免使用預設 h123 |
| 中 | API 速率限制 | 可對敏感 API（登入、抽獎）加 throttling |

---

## 三、體驗優化

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 中 | 錯誤提示改 Toast | 部分 API 失敗仍用 `alert`，可改為 Toast 較友善 |
| 低 | 離線／網路偵測 | 網路斷線或失敗時顯示提示、重試按鈕 |
| 低 | 載入狀態一致性 | 確保各區塊 loading 樣式統一 |

---

## 四、維運優化

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 中 | 備份排程 | 將 `scripts/backup-supabase.sh` 納入 cron 或 Vercel Cron |
| 低 | 關鍵 API 監控 | 對 context、checkin、lottery 加 response time 紀錄 |
| 低 | 操作日誌 | 登入、刪除、匯入等紀錄 log 供稽核 |

---

## 五、程式與維護

| 優先級 | 項目 | 說明 |
|--------|------|------|
| 低 | Lint 清理 | 處理 `react-hooks/exhaustive-deps`、`@next/next/no-img-element` 警告 |
| 低 | 時間常數整合 | 考慮將 `checkin-times` 與 `lottery-deadline` 合併或共用 |
| 低 | 後台系統參數 | 若需後台可調時間，改為影響 `lib/checkin-times` 或透過 API |

---

## 六、建議優先順序

1. **先做**：安全（API 認證、登入機制、密碼）
2. **其次**：體驗（Toast、骨架屏）
3. **之後**：維運（備份、監控）
4. **有空再做**：程式清理、時間常數整合
