# 部署檢查報告

> 產出時間：2026-02-02

## 一、CLI 診斷結果

### Vercel CLI 狀態

| 項目 | 狀態 |
|------|------|
| 登入 | ✅ 已登入（sky770825） |
| 專案連結 | ⚠️ **未連結**：本專案尚未透過 `vercel link` 連結到 Vercel |
| 專案列表 | Hua-Sign-PRI 未出現在 `vercel project ls` 清單中 |

### 可能原因

- 專案可能透過 **GitHub 自動部署**（從 GitHub 匯入），而非 CLI 連結
- 或尚未在 Vercel 建立對應專案

### ⚠️ CLI 連結錯誤

執行 `vercel link --yes` 時出現：

```
Error: Detected linked project does not have "id".
```

**建議**：改由 Vercel Dashboard 操作。到 [vercel.com/new](https://vercel.com/new) 選擇 GitHub repo `sky770825/Hua-Sign-PRI` 匯入，避免使用 CLI link。

---

## 二、建置驗證

| 項目 | 結果 |
|------|------|
| `rm -rf node_modules && npm install` | ✅ 成功 |
| `npm run build` | ✅ 成功 |
| `@cloudflare/next-on-pages` | ✅ 已從 package.json 移除 |
| peer dependency 衝突 | ✅ 已透過 .npmrc `legacy-peer-deps=true` 處理 |

---

## 三、環境變數檢查清單

部署到 Vercel 前，請在 **Project Settings → Environment Variables** 確認：

### 必填（無則無法正常運作）

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`（須為 JWT 格式 `eyJ...`，不可為 `sbp_` CLI token）
- [ ] `ADMIN_PASSWORD`

### 選填（會員同步 / Google Sheets）

- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID`
- [ ] `GOOGLE_SHEETS_CLIENT_EMAIL`
- [ ] `GOOGLE_SHEETS_PRIVATE_KEY`

### 建議

- Production、Preview、Development 三個環境皆需設定
- `SUPABASE_SERVICE_KEY` 務必使用 service_role 金鑰，不是 anon key

---

## 四、已知問題與修正

### 已修正

1. **API 硬編碼 Supabase URL**：`app/api/prizes/route.ts`、`app/api/prizes/[id]/route.ts` 已移除硬編碼 fallback
2. **Cloudflare 依賴**：已移除 `@cloudflare/next-on-pages`，避免與 Next.js 16 衝突
3. **建置快取**：vercel.json 已設定安裝前清除 node_modules

### 仍須注意

1. **Vercel 帳戶**：若曾因帳單暫停，需先恢復
2. **建置快取**：若持續出現舊依賴錯誤，到 Settings → Build Cache → Clear
3. **scripts/** 內的測試腳本仍含 Supabase URL fallback（僅供本地開發，不影響 Vercel 建置）

---

## 五、建議下一步

### 若透過 GitHub 部署

1. 登入 [Vercel Dashboard](https://vercel.com)
2. 確認是否已匯入 `sky770825/Hua-Sign-PRI`
3. 若無，點 **Add New → Project**，選擇該 repo
4. 在專案中設定上述環境變數
5. 若部署失敗，到 Deployments 查看 Logs，並清除 Build Cache 後重試

### 若使用 CLI 部署

```bash
# 1. 連結專案（會建立新專案或連結既有專案）
vercel link --yes

# 2. 設定環境變數（或於 Dashboard 設定）
# vercel env add NEXT_PUBLIC_SUPABASE_URL
# ...

# 3. 部署
vercel deploy --prod --yes
```

---

## 六、專案配置摘要

| 檔案 | 狀態 |
|------|------|
| package.json | engines: node>=18，無 @cloudflare 依賴 |
| vercel.json | framework: nextjs，installCommand 含 rm node_modules |
| .npmrc | legacy-peer-deps=true |
| .gitignore | 含 .env*.local、.vercel |
| lib/supabase.ts | 僅從環境變數讀取，無硬編碼 key |
