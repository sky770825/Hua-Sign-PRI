# GitHub Secret 洩漏修復說明

## 已處理

- 已從 `URGENT_FIX_SERVICE_KEY.md` 移除洩漏的 `sbp_` CLI token
- 已將範例改為 placeholder，避免未來洩漏

## 您需要做的（重要）

### 1. 撤銷洩漏的 Token

該 token 已洩漏，**必須撤銷**：

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
2. 找到對應的 Personal Access Token
3. 點 **Revoke** 撤銷

### 2. 在 GitHub 關閉 Alert

1. 前往 [GitHub 倉庫 → Security → Secret scanning alerts](https://github.com/sky770825/Hua-Sign-PRI/security/secret-scanning)
2. 開啟該 Alert
3. 確認已撤銷 token 後，點 **Close as revoked**

### 3. 使用正確的 service_role Key

- `sbp_` 開頭 = CLI token，**不能用**於 API
- 請改用 Supabase Dashboard → Settings → API → **service_role**（JWT 格式，`eyJ` 開頭）
