# 🖼️ 圖片預覽與中獎視窗改進

## 完成時間
2026-01-13

## 功能概述

### 1. 獎品圖片點擊預覽功能 ✅

#### 功能描述
- 在獎品管理頁面，所有獎品圖片都可以點擊放大預覽
- 在編輯表單中，當前圖片也可以點擊放大預覽
- 方便向團隊介紹獎品細節

#### 實現位置
- **獎品卡片圖片** (`app/admin/attendance_management/page.tsx` line ~2521)
- **編輯表單當前圖片** (`app/admin/attendance_management/page.tsx` line ~3449)

#### 功能特點
- ✅ 點擊圖片即可放大預覽
- ✅ 全屏黑色半透明背景
- ✅ 圖片居中顯示，最大寬度 4xl，最大高度 90vh
- ✅ 右上角關閉按鈕
- ✅ 點擊背景或關閉按鈕可關閉預覽
- ✅ 圖片 hover 效果（透明度變化）
- ✅ 鼠標指針變為 pointer，提示可點擊

#### 代碼實現
```typescript
// 狀態管理
const [previewImage, setPreviewImage] = useState<string | null>(null)

// 圖片點擊事件
onClick={() => setPreviewImage(prize.image_url)}

// 預覽 Modal
{previewImage && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
    {/* 預覽內容 */}
  </div>
)}
```

---

### 2. 中獎視窗改進 ✅

#### 功能描述
- 將原本的 `alert()` 彈窗替換為更大的自定義 Modal
- 增加視覺效果和氛圍感
- 更適合在會議或活動中展示

#### 實現位置
- **抽獎頁面** (`app/lottery/page.tsx` line ~350)

#### 視窗特點
- ✅ **更大的尺寸**：最大寬度 2xl，內邊距 8-12（響應式）
- ✅ **漸變背景**：從黃色到橙色到紅色的漸變
- ✅ **金色邊框**：4px 黃色邊框，增加視覺衝擊
- ✅ **陰影效果**：雙重陰影（黑色 + 金色光暈）
- ✅ **動畫效果**：
  - 背景淡入動畫（fadeIn）
  - 視窗縮放進入動畫（scaleIn，帶彈性效果）
  - 慶祝 emoji 彈跳動畫
- ✅ **內容展示**：
  - 大型慶祝 emoji（🎉）
  - 漸變色標題「恭喜中獎！」
  - 中獎者信息（姓名 + 編號）
  - 獎品信息（圖片 + 名稱）
  - 機率統計（會員中獎機率 + 獎品被抽中機率）
  - 結束語（如果所有獎品抽完）
- ✅ **響應式設計**：適配手機和桌面端

#### 視覺設計
```
┌─────────────────────────────────────┐
│                    [X]               │
│                                      │
│              🎉 (彈跳動畫)            │
│         恭喜中獎！(漸變色)            │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  中獎者：張三                 │   │
│  │  編號：001                    │   │
│  │                              │   │
│  │  [圖片] 獎品名稱              │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────┐  ┌──────────┐        │
│  │ 會員機率  │  │ 獎品機率  │        │
│  │   5.0%   │  │  25.0%   │        │
│  └──────────┘  └──────────┘        │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  感謝大家的參與！              │   │
│  └──────────────────────────────┘   │
│                                      │
│      [確認] (漸變按鈕)               │
└─────────────────────────────────────┘
```

#### 代碼實現
```typescript
// 狀態管理
const [showWinnerModal, setShowWinnerModal] = useState(false)
const [winnerModalData, setWinnerModalData] = useState<{
  winner: Winner
  prize: Prize
  winnerProb: string
  prizeProb: string
  completionMessage?: string
} | null>(null)

// 設置中獎視窗數據（替代 alert）
setWinnerModalData({
  winner: data.winner,
  prize: data.prize,
  winnerProb,
  prizeProb,
  completionMessage: isAllPrizesGone ? (data.prize.completion_message || '感謝大家的參與！') : undefined
})
setShowWinnerModal(true)
```

#### CSS 動畫
新增動畫效果到 `app/globals.css`：
- `@keyframes fadeIn`：淡入效果
- `@keyframes scaleIn`：縮放進入效果（帶彈性）

---

## 使用方式

### 圖片預覽
1. 訪問後台管理 → 獎品管理
2. 點擊任意獎品圖片
3. 圖片會在全屏 Modal 中放大顯示
4. 點擊背景或關閉按鈕即可關閉

### 中獎視窗
1. 在抽獎頁面點擊「開始抽獎」
2. 轉盤旋轉 3 秒後
3. 自動彈出大型中獎視窗
4. 顯示中獎者、獎品、機率等信息
5. 點擊「確認」或背景即可關閉

---

## 技術細節

### 圖片預覽 Modal
- **z-index**: 100（確保在最上層）
- **背景**: `bg-black/80`（80% 透明度黑色）
- **圖片容器**: `max-w-4xl max-h-[90vh]`
- **關閉按鈕**: 右上角，白色半透明背景

### 中獎視窗 Modal
- **z-index**: 50（在轉盤之上）
- **背景**: `bg-black/70 backdrop-blur-sm`（70% 透明度 + 模糊效果）
- **視窗尺寸**: `max-w-2xl`（響應式）
- **邊框**: `border-4 border-yellow-400`
- **陰影**: 雙重陰影（黑色 + 金色光暈）
- **動畫時長**: 0.3-0.4 秒

---

## 改進效果

### 圖片預覽
- ✅ 方便向團隊介紹獎品細節
- ✅ 無需下載或打開新標籤頁
- ✅ 流暢的用戶體驗

### 中獎視窗
- ✅ 更大的視窗，適合投影展示
- ✅ 豐富的視覺效果，增加氛圍感
- ✅ 清晰的層次結構，信息一目了然
- ✅ 響應式設計，適配各種設備

---

## 文件修改清單

1. `app/admin/attendance_management/page.tsx`
   - 添加 `previewImage` 狀態
   - 為獎品卡片圖片添加點擊事件
   - 為編輯表單圖片添加點擊事件
   - 添加圖片預覽 Modal

2. `app/lottery/page.tsx`
   - 添加 `showWinnerModal` 和 `winnerModalData` 狀態
   - 將 `alert()` 替換為 Modal 顯示
   - 添加中獎視窗 Modal（大型、漸變、動畫）

3. `app/globals.css`
   - 添加 `fadeIn` 動畫
   - 添加 `scaleIn` 動畫（帶彈性效果）

---

**狀態**: ✅ 已完成並測試  
**下一步**: 用戶可以測試功能，如有需要可進一步調整視覺效果或動畫
