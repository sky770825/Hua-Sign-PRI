# 出席資料同步說明

## 核心原則

1. **單一資料庫**：所有出席相關資料僅使用 Supabase `estate_attendance_*` 資料表，不使用個別或分離的資料庫。
2. **統計報告**：統計報表以出席管理資料庫為**唯一來源**，統計所有會議紀錄並據此產出數據。

---

## 資料表結構（出席管理資料庫）

| 資料表 | 用途 |
|--------|------|
| `estate_attendance_members` | 會員基本資料 |
| `estate_attendance_meetings` | 會議紀錄（每週四） |
| `estate_attendance_checkins` | 簽到記錄 |
| `estate_attendance_prizes` | 獎品 |
| `estate_attendance_lottery_winners` | 抽獎中獎記錄 |

---

## 資料寫入來源（全部同步至出席管理）

| 功能 | API / 腳本 | 寫入資料表 |
|------|------------|------------|
| 出席管理 - 新增/編輯會議 | `POST /api/meetings` | meetings |
| 出席管理 - 編輯/刪除會議 | `PUT/DELETE /api/meetings/[id]` | meetings, checkins |
| 出席管理 - 手動簽到/儲存/刪除 | `POST /api/checkin`, `POST /api/checkin/delete` | checkins |
| 簽到頁面 - 會員簽到 | `POST /api/checkin` | checkins |
| 會員管理 - 新增/編輯/刪除 | `POST /api/members/create`, `PUT/DELETE /api/members/[id]` | members |
| 統計匯入 - CSV 匯入 | `POST /api/statistics/import` | meetings, checkins |
| 出席 CSV 匯入 | `scripts/import-attendance-csv.mjs` | members, meetings, checkins |

所有寫入皆使用 `supabaseService`，確保繞過 RLS 並寫入同一資料庫。

---

## 統計報告資料來源

| 報表 | API | 讀取來源 |
|------|-----|----------|
| 會員出席統計 | `GET /api/statistics/member-attendance` | meetings, members, checkins |

- **總會議數**：僅計算「會議表存在且有簽到記錄」的會議（與出席管理 loadData 邏輯完全一致）
- **會員列表**：`estate_attendance_members`
- **簽到記錄**：`estate_attendance_checkins`（僅統計屬於有效會議的記錄）

統計依此計算：出席、遲到、早退、代理、缺席、出席率。確保統計報表與出席管理畫面可驗證的資料完全同步。

---

## 外部同步（單向，非出席來源）

| 功能 | 方向 | 說明 |
|------|------|------|
| Google Sheets 同步 | 資料庫 → Sheets | 僅同步**會員資料**至 Google Sheets，Sheets 不作為出席或會議資料來源 |

---

## 維護注意事項

1. 新增任何出席相關 API 時，必須使用 `supabaseService` 與 `estate_attendance_*` 資料表。
2. 不得新增或使用其他資料庫作為出席或會議紀錄來源。
3. 統計邏輯必須以 `estate_attendance_meetings` 與 `estate_attendance_checkins` 為唯一依據。
