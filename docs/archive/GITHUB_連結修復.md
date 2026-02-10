# GitHub 連結修復說明

> 倉庫：https://github.com/sky770825/Hua-Sign-PRI

---

## 已修正

- **package.json**：已加入 `repository` 欄位，指向正確 GitHub 網址

---

## 若仍有「key 錯誤」，可能是以下其中一種

### 1. Git 推送時需要驗證（HTTPS）

若 `git push` 失敗並提示認證錯誤：

1. 前往 [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 產生新 Token（勾選 `repo` 權限）
3. 推送時用 Token 當密碼，或改用 SSH

### 2. 改用 SSH（較建議）

```bash
# 檢查現有 remote
git remote -v

# 改成 SSH
git remote set-url origin git@github.com:sky770825/Hua-Sign-PRI.git
```

需先在 [GitHub SSH keys](https://github.com/settings/keys) 新增本機公鑰。

### 3. Vercel 與 GitHub 連線

若 Vercel 無法從 GitHub 拉程式碼：

1. [Vercel Dashboard](https://vercel.com/dashboard) → 專案 → **Settings** → **Git**
2. 若顯示連線錯誤，可先 **Disconnect** 再 **Reconnect** GitHub

### 4. GitHub Actions 需用的 Secrets

若使用 GitHub Actions，需在 [Repo → Settings → Secrets](https://github.com/sky770825/Hua-Sign-PRI/settings/secrets/actions) 設定例如：

- `SUPABASE_SERVICE_KEY`（若有在 workflow 中使用）

---

## 本機遠端設定

目前遠端為：

```
origin  https://github.com/sky770825/Hua-Sign-PRI.git
```

若要改為 SSH：

```bash
git remote set-url origin git@github.com:sky770825/Hua-Sign-PRI.git
```
