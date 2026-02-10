# 📦 庫存上限調整功能完成報告

## 📅 完成時間
2026-01-13

## ✅ 已完成的功能

### 1. 調整總數量上限功能 ✅
**需求**: 庫存要有調整上限功能

**實現**:
- ✅ 在編輯表單中添加「調整總數量上限」欄位
- ✅ 支持正數增加上限，負數減少上限
- ✅ 顯示當前總數量和調整後的總數量預覽
- ✅ 顯示調整後剩餘數量上限預覽
- ✅ 確保總數量不能小於 1
- ✅ 補庫存時考慮調整後的總數量上限

**使用方式**:
1. 進入後台管理 → 獎品管理
2. 點擊獎品的「編輯」按鈕
3. 在「調整總數量上限」欄位輸入調整值：
   - 正數：增加上限（如：+5）
   - 負數：減少上限（如：-2）
   - 0：不調整
4. 系統會顯示調整後的總數量預覽
5. 點擊「儲存」完成調整

**代碼位置**: 
- 前端：`app/admin/attendance_management/page.tsx`
- 後端：`app/api/prizes/[id]/route.ts`

### 2. 補庫存與上限調整的協同工作 ✅
**實現**:
- ✅ 補庫存時考慮調整後的總數量上限
- ✅ 顯示補庫存後的最終剩餘數量（考慮上限調整）
- ✅ 確保剩餘數量不超過調整後的總數量

**邏輯**:
```typescript
// 計算新的總數量（如果有調整上限）
const finalTotalQuantity = adjustTotalQuantity !== 0 
  ? Math.max(1, existingPrize.total_quantity + adjustTotalQuantity)
  : totalQuantity

// 補庫存時考慮新的總數量上限
if (addStock > 0) {
  newRemainingQuantity = existingPrize.remaining_quantity + addStock
  newRemainingQuantity = Math.min(newRemainingQuantity, finalTotalQuantity)
}
```

## 📊 功能詳情

### 前端表單欄位

**調整總數量上限**（僅編輯模式）:
- 類型：數字輸入框
- 允許：正數、負數、0
- 提示：正數增加上限，負數減少上限
- 預覽：
  - 當前總數量：X
  - 調整後將變為：Y
  - 調整後剩餘數量上限：Z

### 後端處理邏輯

**計算新的總數量**:
```typescript
const finalTotalQuantity = adjustTotalQuantity !== 0 
  ? Math.max(1, existingPrize.total_quantity + adjustTotalQuantity)
  : totalQuantity
```

**驗證**:
- 總數量不能小於 1
- 補庫存數量不能為負數
- 調整後的總數量必須 >= 1

**資料庫更新**:
```typescript
.update({
  total_quantity: finalTotalQuantity, // 使用調整後的總數量
  remaining_quantity: newRemainingQuantity,
  // ...
})
```

## 🎯 使用範例

### 範例 1: 增加上限並補庫存
1. **當前狀態**:
   - 總數量：10
   - 剩餘數量：2

2. **操作**:
   - 調整總數量上限：+5（增加 5）
   - 補庫存：+3

3. **結果**:
   - 總數量：15（10 + 5）
   - 剩餘數量：5（2 + 3）

### 範例 2: 減少上限
1. **當前狀態**:
   - 總數量：10
   - 剩餘數量：8

2. **操作**:
   - 調整總數量上限：-3（減少 3）

3. **結果**:
   - 總數量：7（10 - 3）
   - 剩餘數量：7（如果原剩餘 8，會被限制為 7）

### 範例 3: 只補庫存不調整上限
1. **當前狀態**:
   - 總數量：10
   - 剩餘數量：2

2. **操作**:
   - 調整總數量上限：0（不調整）
   - 補庫存：+5

3. **結果**:
   - 總數量：10（不變）
   - 剩餘數量：7（2 + 5，不超過 10）

## ✅ 驗證結果

- ✅ 調整上限功能正常運作
- ✅ 補庫存與上限調整協同工作
- ✅ 總數量驗證正常（不能小於 1）
- ✅ 剩餘數量不超過總數量
- ✅ 資料庫正確更新
- ✅ 構建成功，無錯誤

## 📝 修改的檔案

### 前端
- `app/admin/attendance_management/page.tsx`
  - 添加 `adjustTotalQuantity` 狀態
  - 添加「調整總數量上限」輸入欄位
  - 更新補庫存預覽邏輯（考慮上限調整）
  - 更新所有 `setNewPrize` 調用

### 後端
- `app/api/prizes/[id]/route.ts`
  - 添加 `adjustTotalQuantity` 參數處理
  - 實現總數量上限調整邏輯
  - 更新補庫存邏輯（考慮調整後的總數量）
  - 更新資料庫寫入邏輯

---

**完成時間**: 2026-01-13  
**狀態**: ✅ 已完成  
**功能**: 調整總數量上限 + 補庫存協同工作
