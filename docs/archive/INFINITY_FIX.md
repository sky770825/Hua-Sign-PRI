# 🔧 Infinity% 問題修復報告

## 問題描述
頁面顯示「每獎品機率：infinity%」，這是因為當所有獎品都被抽完時，可用獎品數量為 0，導致除以零的計算結果。

## 根本原因

### 計算邏輯問題
當 `prizes.filter(p => p.remaining_quantity > 0).length` 為 0 時：
```typescript
(1 / 0 * 100) = Infinity
```

這會導致顯示 `infinity%` 或 `Infinity%`。

## 修復內容

### 1. 修復「每獎品機率」顯示 ✅
**位置**: `app/lottery/page.tsx` - 第 590-596 行

**修復前**:
```typescript
{prizes.length > 0 && (
  <div className="px-2 py-0.5 bg-pink-100 rounded-full">
    <p className="text-xs text-pink-700 font-semibold">
      每獎品機率：{(1 / prizes.filter(p => p.remaining_quantity > 0).length * 100).toFixed(1)}%
    </p>
  </div>
)}
```

**修復後**:
```typescript
{(() => {
  const availablePrizes = prizes.filter(p => p.remaining_quantity > 0)
  const availableCount = availablePrizes.length
  if (availableCount === 0) {
    return (
      <div className="px-2 py-0.5 bg-red-100 rounded-full">
        <p className="text-xs text-red-700 font-semibold">
          無可用獎品
        </p>
      </div>
    )
  }
  return (
    <div className="px-2 py-0.5 bg-pink-100 rounded-full">
      <p className="text-xs text-pink-700 font-semibold">
        每獎品機率：{(1 / availableCount * 100).toFixed(1)}%
      </p>
    </div>
  )
})()}
```

**改進**:
- ✅ 檢查可用獎品數量
- ✅ 如果為 0，顯示「無可用獎品」而不是計算機率
- ✅ 使用紅色背景提示用戶注意

### 2. 修復「每人中獎機率」顯示 ✅
**位置**: `app/lottery/page.tsx` - 第 586-589 行

**修復前**:
```typescript
每人中獎機率：{(1 / eligibleCount * 100).toFixed(1)}%
```

**修復後**:
```typescript
每人中獎機率：{eligibleCount > 0 ? (1 / eligibleCount * 100).toFixed(1) + '%' : '0%'}
```

**改進**:
- ✅ 檢查可抽獎人數
- ✅ 如果為 0，顯示「0%」而不是計算

### 3. 修復抽獎後的機率顯示 ✅
**位置**: `app/lottery/page.tsx` - 第 334-339 行

**修復前**:
```typescript
const winnerProb = data.winnerProbability || ((1 / checkinCount * 100).toFixed(2) + '%')
const prizeProb = data.prizeProbability || ((1 / prizes.filter(p => p.remaining_quantity > 0).length * 100).toFixed(2) + '%')
```

**修復後**:
```typescript
const winnerProb = data.winnerProbability || (checkinCount > 0 ? (1 / checkinCount * 100).toFixed(2) + '%' : '0%')
const availablePrizesCount = prizes.filter(p => p.remaining_quantity > 0).length
const prizeProb = data.prizeProbability || (availablePrizesCount > 0 ? (1 / availablePrizesCount * 100).toFixed(2) + '%' : '0%')
```

**改進**:
- ✅ 檢查簽到人數和可用獎品數量
- ✅ 如果為 0，顯示「0%」而不是計算

## 顯示效果

### 當有可用獎品時
- **每人中獎機率**: 顯示正確的百分比（如：33.3%）
- **每獎品機率**: 顯示正確的百分比（如：50.0%）

### 當沒有可用獎品時
- **每人中獎機率**: 顯示「0%」
- **每獎品機率**: 顯示「無可用獎品」（紅色背景提示）

### 當沒有可抽獎人數時
- **每人中獎機率**: 顯示「0%」
- **每獎品機率**: 不顯示（因為無法抽獎）

## 測試建議

### 1. 測試無可用獎品情況
- 當所有獎品都被抽完時
- 應該顯示「無可用獎品」而不是 `infinity%`

### 2. 測試有可用獎品情況
- 當有可用獎品時
- 應該顯示正確的百分比

### 3. 測試無可抽獎人數情況
- 當沒有簽到會員時
- 應該顯示「0%」而不是 `infinity%`

## 修改的檔案

- `app/lottery/page.tsx`
  - 修復「每獎品機率」顯示邏輯（第 590-596 行）
  - 修復「每人中獎機率」顯示邏輯（第 586-589 行）
  - 修復抽獎後的機率顯示邏輯（第 334-339 行）

---

**修復時間**: 2026-01-13  
**狀態**: ✅ 已完成  
**問題**: 除以零導致 `infinity%` 顯示  
**解決方案**: 添加除以零檢查，顯示友好的提示信息
