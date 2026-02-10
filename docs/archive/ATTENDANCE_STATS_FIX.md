# 會員出席統計落差修復說明

## 問題描述

統計報表的會員出席次數與出席管理畫面資料存在落差。

## 根本原因

**會議日期來源不一致**：

| 模組 | 修復前 | 修復後 |
|------|--------|--------|
| **API** (`/api/statistics/member-attendance`) | 從 `checkins` 表取「所有有簽到的 meeting_date」 | 僅計算「會議表存在且有簽到」的會議 |
| **出席管理 loadData** | 從 `meetings` 表取日期，篩選有簽到的 | 同上（邏輯已一致） |

若 `checkins` 表中有 `meeting_date` 但 `meetings` 表沒有該會議（例如舊匯入、手動 SQL），API 會計入但出席管理選單無法選擇該日期，導致兩邊數字不一致。

## 修復內容

### 1. API 修正 (`app/api/statistics/member-attendance/route.ts`)

- **總會議數**：改為「會議表存在 ∩ 有簽到記錄」的會議日期
- **簽到統計**：僅統計屬於上述有效會議的簽到記錄，排除孤兒簽到

### 2. 診斷腳本強化 (`scripts/check-attendance-stats.mjs`)

- 新增「孤兒簽到」檢測：列出 checkins 有但 meetings 沒有的日期
- 新增「統計報表使用的總會議數」輸出

### 3. 文件更新

- `ATTENDANCE_SYNC.md`：更新統計邏輯說明

## 驗證方式

```bash
# 執行診斷腳本（不需啟動伺服器）
node scripts/check-attendance-stats.mjs
```

檢查是否有孤兒簽到，若有請在會議表補建對應會議，或移除無效簽到。

## 出席狀態對應（兩邊一致）

| 狀態 | 計入出席 | 計入遲到 | 計入代理 |
|------|----------|----------|----------|
| present | ✅ | - | - |
| early | ✅ | - | - |
| late | ✅ | ✅ | 若留言含代理關鍵字 |
| early_leave | ✅ | - | 若留言含代理關鍵字 |
| proxy | ✅ | - | ✅ |
| absent | ❌ | - | - |
