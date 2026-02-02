# 專案模組結構說明

專案已模組化，方便維護與擴充。目錄與使用方式如下。

## 目錄結構

```
華地產簽到功能/
├── app/                    # Next.js 頁面與 API 路由（依功能分層）
├── components/             # 共用 UI 元件
│   └── ui/                 # 基礎 UI 元件
│       ├── LoadingSpinner  # 載入動畫
│       ├── Toast           # 通知訊息
│       ├── Modal           # 模態框
│       ├── TabNav          # 標籤導覽
│       ├── Button          # 按鈕
│       └── Card            # 卡片容器
├── hooks/                  # 自訂 React Hooks（資料取得與狀態）
├── lib/                    # 工具與後端邏輯
│   └── services/           # 前端服務層（API 呼叫封裝）
├── types/                  # 全域 TypeScript 型別定義
└── public/
```

## 模組說明

### 1. `types/` — 型別定義

- **用途**：集中定義會員、會議、簽到、獎品、抽獎等型別，避免在各頁重複寫 interface。
- **使用**：`import type { Member, CheckinRecord, Prize } from '@/types'`
- **檔案**：`types/index.ts`

### 2. `components/` — 共用元件

- **用途**：可重複使用的 UI 元件。
- **子目錄**：
  - `ui/`：基礎 UI 元件。
- **可用元件**：
  - `LoadingSpinner` — 載入動畫（可設 size、label）
  - `Toast` — 通知訊息（success / error / info）
  - `Modal` — 模態框（可設 title、widthClass）
  - `TabNav` — 標籤導覽列
  - `Button` — 按鈕（variant: primary / secondary / danger / ghost）
  - `Card` — 卡片容器
- **使用**：`import { LoadingSpinner, Toast, Modal, Button } from '@/components/ui'`
- **匯出**：各子目錄有 `index.ts` 統一匯出。

### 3. `hooks/` — 自訂 Hooks

- **用途**：封裝 API 呼叫與狀態，頁面只負責畫面與互動。
- **可用 Hooks**：
  - `useMembers()` — 會員列表
  - `useCheckins(date)` — 指定日期的簽到與會議
  - `useMeetings()` — 會議列表
  - `usePrizes()` — 獎品列表
  - `useWinners(date?)` — 中獎記錄
  - `useToast()` — Toast 通知狀態管理
- **使用**：`import { useMembers, useCheckins, useToast } from '@/hooks'`
- **回傳**：`{ data, loading, error, refetch }` 形式，便於在頁面顯示與重新載入。

### 4. `lib/` — 工具與後端邏輯

- **用途**：API 回應格式、Supabase、快取、格式化、驗證等。
- **子目錄**：
  - `services/` — 前端服務層，封裝 CRUD API 呼叫（createMember、updatePrize、drawLottery 等）
- **使用**：
  - 單一檔案：`import { apiError, apiSuccess } from '@/lib/api-utils'`
  - 統一匯出：`import { apiError, supabase, formatId, createMember } from '@/lib'`
  - 服務層：`import { createMember, deletePrize, drawLottery } from '@/lib/services'`
- **說明**：既有 `@/lib/xxx` 匯入可繼續使用，新程式可改為從 `@/lib` 匯入。

### 5. `app/` — 頁面與 API

- **頁面**：`app/checkin/`、`app/lottery/`、`app/admin/` 等，只負責畫面與使用者操作。
- **API**：`app/api/` 下各路由，使用 `lib` 與 `types`，不直接依賴頁面元件。

## 匯入路徑（tsconfig `@/*`）

| 路徑 | 說明 |
|------|------|
| `@/types` | 全域型別 |
| `@/components/ui` | 共用 UI 元件 |
| `@/hooks` | 自訂 Hooks |
| `@/lib` | 工具與後端邏輯（可選統一入口） |
| `@/lib/xxx` | 單一 lib 模組（如 api-utils、supabase） |

## 建議使用方式

1. **新頁面**：型別從 `@/types` 引入，資料取得優先使用 `hooks/`，UI 使用 `components/ui`。
2. **新 API 路由**：使用 `lib/api-utils`、`lib/supabase`、`lib/validation` 等，必要時使用 `@/types`。
3. **新共用 UI**：放在 `components/ui/`（或依功能再分子目錄），並在對應 `index.ts` 匯出。

這樣可維持單一職責、方便測試與後續擴充。
