# 華地產簽到系統 - 全域自動化 CLI

## 進入點

- **單一入口**：`node scripts/cli.mjs <command> [args...]` 或 `npm run cli -- <command> [args...]`
- **說明**：`npm run cli -- help`

## 目錄結構

```
scripts/
  cli.mjs                 # CLI 進入點，解析命令並分派
  lib/                    # 共用模組（全域使用）
    path.mjs              # projectRoot, scriptsDir
    env.mjs               # loadEnv() 載入 .env.local
    supabase.mjs          # getSupabase(), TABLES
  commands/               # 子命令實作
    import-csv.mjs        # 匯入單一 CSV（runImport + run）
    import-batch.mjs      # 批次匯入多個 CSV
    db-delete-meetings.mjs # 刪除指定日期前會議/簽到/抽獎
    verify-stats.mjs      # 驗證統計 API
  import-attendance-csv.mjs   # 薄包裝 → commands/import-csv.mjs
  import-attendance-batch.mjs  # 薄包裝 → commands/import-batch.mjs
  delete-meetings-before-date.mjs # 薄包裝 → commands/db-delete-meetings.mjs
```

## 命令一覽

| 命令 | 說明 |
|------|------|
| `import csv <file>` | 匯入單一會議出席表 CSV |
| `import batch <file...>` | 批次匯入多個 CSV |
| `db delete-meetings-before <date>` | 刪除該日期之前的會議、簽到、抽獎（預設 2025-08-14） |
| `verify stats [baseUrl]` | 驗證 /api/statistics/member-attendance |
| `verify prizes [baseUrl]` | 驗證獎品 CRUD API（委派 scripts/verify-prizes-crud.mjs） |
| `check attendance-stats` | 診斷出席統計（委派 scripts/check-attendance-stats.mjs） |
| `test lottery [date]` | 抽獎 10 次後刪除中獎紀錄（委派 scripts/test-lottery-10-draws.mjs） |
| `test e2e [baseUrl]` | E2E 測試（委派 scripts/e2e-test-flow.mjs） |
| `run <scriptName> [args...]` | 執行 scripts 下既有腳本（.mjs 或 .sh） |

## 共用 lib 使用方式

其他腳本可改為使用 `scripts/lib`，避免重複載入 env 與建立 Supabase 客戶端：

```js
import { loadEnv } from './lib/env.mjs'
import { getSupabase } from './lib/supabase.mjs'

loadEnv()  // 可選，getSupabase 內會自動 loadEnv
const { supabase, TABLES } = getSupabase()
```

## 重構前後對照

- **改前**：各腳本各自讀取 `.env.local`、建立 Supabase、解析 `process.argv`。
- **改後**：CLI 單一進入點、`lib/` 共用 env/supabase、匯入/刪除會議邏輯集中在 `commands/`，原腳本改為薄包裝以保持相容。
