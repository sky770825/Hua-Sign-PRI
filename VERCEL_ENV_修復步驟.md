# Vercel 環境變數修復步驟

> 若 `/api/health` 回傳 `hasServiceKey: false`，請依下列步驟檢查

---

## 目前診斷結果

- **網址**：https://hua-sign-pri-j5js.vercel.app
- **問題**：`SUPABASE_SERVICE_KEY` 未被識別（hasServiceKey: false）
- **影響**：會員名單、簽到、抽獎等需 Supabase 的功能無法使用

---

## 方法一：透過 Vercel Dashboard（建議）

### 1. 確認專案

- 前往：https://vercel.com/linebot/hua-sign-pri-j5js
- 若此連結打不開，請在 Dashboard 中找到對應 **hua-sign-pri-j5js** 的專案

### 2. 進入環境變數設定

- 點選 **Settings** → **Environment Variables**

### 3. 檢查變數

在列表中應看到：

| Key | 必須 | 說明 |
|-----|------|------|
| NEXT_PUBLIC_SUPABASE_URL | ✓ | Supabase 專案 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | anon public key |
| SUPABASE_SERVICE_KEY | ✓ | **service_role** key（eyJ 開頭）|

### 4. 新增或修正 SUPABASE_SERVICE_KEY

- 若無此變數：點 **Add New**
- 若有但可能有誤：刪除後重新新增

**設定方式：**

1. **Key（名稱）**：`SUPABASE_SERVICE_KEY`（一個字母都不能錯）
2. **Value（值）**：到 [Supabase Dashboard](https://supabase.com/dashboard) → 選擇專案 → **Settings** → **API** → 在 **Project API keys** 區塊找到 **service_role** → 點 **Reveal** → **Copy**
3. **Environments**：務必勾選 **Production**
4. 點 **Save**

### 5. 強制重新部署

- 到 **Deployments** 頁籤
- 最新 deployment 右側 **⋯** → **Redeploy**
- 選擇 **Redeploy with existing Build Cache** 或 **Clear cache and redeploy**

### 6. 驗證

約 2 分鐘後訪問：https://hua-sign-pri-j5js.vercel.app/api/health

若回傳 `"ok": true` 且 `"hasServiceKey": true`，即代表設定成功。

---

## 方法二：透過 Vercel CLI

若 Dashboard 設定後仍無效，可改用 CLI：

```bash
# 安裝 Vercel CLI（若尚未安裝）
npm i -g vercel

# 登入並連結專案
cd /path/to/華地產簽到功能
vercel link

# 設定環境變數（會提示輸入值）
vercel env add SUPABASE_SERVICE_KEY production

# 重新部署
vercel --prod
```

---

## 常見錯誤

| 狀況 | 說明 |
|------|------|
| 變數名稱打錯 | 必須是 `SUPABASE_SERVICE_KEY`，不是 `SERVICE_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`（程式也有支援後者） |
| 只勾選 Preview | Production 部署不會讀到，請勾選 **Production** |
| 使用錯誤的 key | 必須是 **service_role**，不是 anon key，也不是 `sbp_` 開頭的 CLI token |
| 未重新部署 | 修改環境變數後一定要 Redeploy |
| 錯誤的 Vercel 專案 | 若有多個專案，請確認是在 **hua-sign-pri-j5js** 設定 |

---

## 取得 service_role key 的步驟

1. 開啟 https://supabase.com/dashboard
2. 選擇專案（ref: sqgrnowrcvspxhuudrqc）
3. 左側 **Settings** → **API**
4. 在 **Project API keys** 找到 **service_role**
5. 點 **Reveal** 顯示內容
6. 點 **Copy** 複製（格式為 `eyJ...` 開頭的長字串）
