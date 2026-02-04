# 部署前檢查清單

## 應注意的事項

### 1. 必要檔案必須提交
- **`lib/lottery-deadline.ts`** - 抽獎 API 與抽獎頁面依賴，未提交會導致 build 失敗（Module not found）

### 2. ES5 相容性
- tsconfig `target: "es5"` 時，`Set`/`Map` 不可直接使用 spread：`[...mySet]` 會報錯
- 改用 `Array.from(mySet)` 或 `[...Array.from(mySet)]`

### 3. 環境變數（Vercel）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`（必須是 JWT，非 sbp_xxx）
- `ADMIN_PASSWORD`（選填）

### 4. Node 版本
- package.json `engines.node: "20.x"`，GitHub Actions 與 Vercel 皆使用 Node 20

### 5. 既有 Lint 警告（不阻擋部署）
- `react-hooks/exhaustive-deps`、`@next/next/no-img-element` 等為 warnings
