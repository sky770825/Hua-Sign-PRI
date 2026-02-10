# wrangler.toml 設置說明

## ✅ 已完成的設置

我已經創建了 `wrangler.toml` 文件，包含以下配置：

```toml
name = "hua-sign-pri"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
```

這個文件已經提交並推送到 GitHub。

## 📋 接下來會發生什麼

### 自動方式（如果使用 V2 構建系統）

1. Cloudflare Pages 會自動讀取 `wrangler.toml` 文件
2. 下次部署時會自動應用 `nodejs_compat` 設置
3. 等待 2-5 分鐘讓自動部署完成

### 手動方式（如果使用 V1 構建系統）

如果 Cloudflare Pages 使用 V1 構建系統，`wrangler.toml` 可能不會被自動讀取。在這種情況下，需要：

1. **在 Dashboard 中手動設置**（推薦）：
   - 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
   - 找到「Compatibility Flags」
   - 輸入：`nodejs_compat`
   - 勾選 Production 和 Preview
   - 保存

2. **或啟用 V2 構建系統**：
   - 在 Settings 中尋找「Build system version」
   - 切換到 V2（如果可用）

## 🔍 如何檢查是否生效

### 方式 1: 檢查構建日誌

前往部署歷史：
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments

查看最新部署的構建日誌，應該會看到：
- 讀取 `wrangler.toml` 的訊息
- 或 `nodejs_compat` 相關的設置

### 方式 2: 檢查網站

部署完成後：
```bash
curl -I https://hua-sign-pri.pages.dev
```

應該返回 HTTP 200，而不是 404。

## ⚠️ 重要提醒

1. **必須設置 compatibility_date**
   - `wrangler.toml` 必須包含 `compatibility_date`
   - 不能只設置 `compatibility_flags`

2. **需要重新部署**
   - 設置後必須重新部署才能生效
   - 可以等待自動部署，或手動觸發

3. **如果仍然 404**
   - 檢查構建日誌確認設置是否被讀取
   - 如果沒有，請在 Dashboard 中手動設置

## 🔗 相關連結

- **部署歷史**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
- **Functions 設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
- **構建設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds
