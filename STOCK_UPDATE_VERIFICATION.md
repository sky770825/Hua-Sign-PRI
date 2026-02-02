# ✅ 補庫存資料庫寫入驗證

## 📊 代碼邏輯確認

### API 路由：`PUT /api/prizes/[id]`

**補庫存邏輯**（第 216-228 行）:
```typescript
// 計算剩餘數量
let newRemainingQuantity: number
if (addStock > 0) {
  // 補庫存：在現有剩餘數量基礎上增加
  newRemainingQuantity = existingPrize.remaining_quantity + addStock
  // 確保不超過總數量
  newRemainingQuantity = Math.min(newRemainingQuantity, totalQuantity)
} else {
  // 正常更新：計算剩餘數量
  const usedQuantity = existingPrize.total_quantity - existingPrize.remaining_quantity
  newRemainingQuantity = Math.max(0, totalQuantity - usedQuantity)
}
```

**資料庫更新**（第 232-244 行）:
```typescript
const { data, error: updateError } = await supabase
  .from(TABLES.PRIZES)
  .update({
    name,
    image_url: imageUrl,
    image_key: imageKey,
    total_quantity: totalQuantity,
    remaining_quantity: newRemainingQuantity, // ✅ 這裡會寫入資料庫
    probability: 1.0,
    completion_message: completionMessage,
    updated_at: new Date().toISOString(),
  })
  .eq('id', id)
  .select()
```

## ✅ 確認事項

### 1. 補庫存邏輯
- ✅ 正確計算新剩餘數量：`existingPrize.remaining_quantity + addStock`
- ✅ 限制不超過總數量：`Math.min(newRemainingQuantity, totalQuantity)`
- ✅ 驗證補庫存數量不能為負數

### 2. 資料庫寫入
- ✅ 使用 Supabase `.update()` 方法
- ✅ 更新 `remaining_quantity` 欄位
- ✅ 更新 `updated_at` 時間戳
- ✅ 使用 `.eq('id', id)` 確保更新正確的記錄
- ✅ 使用 `.select()` 返回更新後的數據

### 3. 錯誤處理
- ✅ 檢查 `updateError` 並返回錯誤響應
- ✅ 記錄日誌：`console.log('更新獎品:', { id, name, totalQuantity, addStock, newRemainingQuantity })`

## 🧪 測試步驟

### 測試補庫存功能

1. **當前狀態**:
   - 獎品 ID: 2
   - 總數量: 1
   - 剩餘數量: 0

2. **執行補庫存**:
   - 在後台管理 → 獎品管理
   - 編輯獎品 ID 2
   - 輸入補庫存數量: 3
   - 點擊「儲存」

3. **預期結果**:
   - 剩餘數量應該變為: 1（因為總數量是 1，所以最多只能補到 1）
   - 資料庫中的 `remaining_quantity` 應該更新為 1
   - `updated_at` 應該更新為當前時間

## 📝 資料庫欄位

### `estate_attendance_prizes` 表結構
- `id`: 獎品 ID（主鍵）
- `name`: 獎品名稱
- `total_quantity`: 總數量
- `remaining_quantity`: 剩餘數量（**會更新**）
- `probability`: 機率（固定為 1.0）
- `updated_at`: 更新時間（**會更新**）

## ✅ 結論

**補庫存功能會正確寫入資料庫**：
1. ✅ 邏輯正確計算新剩餘數量
2. ✅ 使用 Supabase `.update()` 方法寫入資料庫
3. ✅ 更新 `remaining_quantity` 和 `updated_at` 欄位
4. ✅ 有完整的錯誤處理和日誌記錄

---

**驗證時間**: 2026-01-13  
**狀態**: ✅ 確認會寫入資料庫
