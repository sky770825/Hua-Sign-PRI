# 幸運轉盤與獎品一致性修復說明

## 問題描述

1. 轉盤抽到的獎品與實際中獎內容不一致
2. 獎品列表顯示不一致（轉盤、側欄、中獎名單）
3. 獎品無基本照片

## 根本原因

1. **快取導致資料不同步**：獎品 API 使用 5 分鐘快取，轉盤可能載入舊獎品，但抽獎 API 取得最新獎品，造成轉盤位置與中獎不符
2. **獎品排序不一致**：獎品 API 使用 `id DESC`，抽獎 API 使用 `id ASC`，轉盤顯示與抽獎邏輯不同步
3. **無 placeholder 圖片**：獎品無 `image_url` 時顯示空白

## 修復內容

### 1. 抽獎前強制取得最新獎品

- 抽獎按鈕點擊後，先呼叫 `/api/prizes?nocache=1` 取得最新獎品
- 使用 `nocache=1` 繞過快取
- 轉盤角度依抽獎時取得的獎品列表計算

### 2. 統一獎品排序

- 獎品 API：改為 `id ASC`（與抽獎 API 一致）
- 抽獎頁面載入：使用 `nocache=1` 並排序 `a.id - b.id`
- 確保轉盤、側欄、中獎名單皆為相同順序

### 3. 獎品 API 支援 nocache

- `GET /api/prizes?nocache=1` 或 `?fresh=1` 時直接查詢資料庫，不使用快取

### 4. 獎品圖片 placeholder

- 新增 `lib/prize-placeholder.ts`，提供 `getPrizeImageUrl()` 工具
- 無圖片時使用 `https://picsum.photos/seed/estate-prize-{id}/200/200`
- 抽獎頁、獎品管理、歷史獲獎紀錄皆使用此工具
- 執行 `node scripts/add-prize-placeholder-images.mjs` 為資料庫中無圖片的獎品寫入 placeholder URL

## 驗證方式

1. 到幸運轉盤頁面，點「刷新」確認獎品列表
2. 執行抽獎，確認轉盤停止位置與中獎內容一致
3. 檢查側欄獎品列表與轉盤、中獎名單一致
4. 確認所有獎品皆有顯示圖片
