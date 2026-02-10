# 自動化設置 nodejs_compat 指南

## ✅ 已創建的自動化腳本

我已經為您創建了多個自動化腳本，可以幫助您自動設置 `nodejs_compat` Compatibility Flag。

## 🚀 快速開始

### 方式 1: 使用 npm 腳本（推薦）

```bash
npm run setup:nodejs-compat
```

這個腳本會：
- ✅ 檢查是否已有 API Token
- ✅ 如果沒有，會引導您獲取 API Token
- ✅ 自動打開 Dashboard 設置頁面（可選）
- ✅ 提供詳細的操作指引

### 方式 2: 完全自動化（需要 API Token）

如果您已經有 API Token：

```bash
# 1. 設置 API Token
export CLOUDFLARE_API_TOKEN='your-api-token-here'

# 2. 執行自動設置
npm run auto:nodejs-compat
```

這個腳本會：
- ✅ 自動使用 API 設置 `nodejs_compat`
- ✅ 設置給 Production 和 Preview 兩個環境
- ✅ 自動觸發新部署

### 方式 3: 完全自動化（嘗試所有方法）

```bash
bash scripts/auto-setup-complete.sh
```

這個腳本會：
- ✅ 檢查 `wrangler.toml` 文件
- ✅ 嘗試使用 API 設置
- ✅ 如果失敗，提供 Dashboard 連結和指引

## 📋 獲取 API Token（用於完全自動化）

如果您想使用完全自動化的方式，需要先獲取 API Token：

### 步驟：

1. **前往 API Token 頁面**
   https://dash.cloudflare.com/profile/api-tokens

2. **創建新 Token**
   - 點擊「Create Token」（創建令牌）
   - 選擇「Edit Cloudflare Workers」模板
   - 或自定義權限：
     - Account: Cloudflare Pages: Edit
   - 點擊「Continue to summary」
   - 點擊「Create Token」

3. **複製 Token**
   - Token 只顯示一次，請保存好

4. **設置環境變數**
   ```bash
   export CLOUDFLARE_API_TOKEN='your-token-here'
   ```

5. **執行自動設置**
   ```bash
   npm run auto:nodejs-compat
   ```

## 🎯 推薦方式

### 最簡單：Dashboard 手動設置

**不需要 API Token，直接在網頁中設置：**

1. **直接前往設置頁面：**
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

2. **操作步驟：**
   - 點擊「Functions」選項卡
   - 找到「Compatibility Flags」輸入框
   - 輸入：`nodejs_compat`
   - 確保勾選 Production 和 Preview
   - 點擊「Save」保存
   - 前往「Deployments」頁面觸發新部署

### 完全自動化：使用 API Token

如果您想完全自動化，可以使用 API Token：

```bash
export CLOUDFLARE_API_TOKEN='your-token'
npm run auto:nodejs-compat
```

## 📝 可用的 npm 腳本

| 腳本 | 說明 |
|------|------|
| `npm run setup:nodejs-compat` | 智能自動化設置（會引導您獲取 API Token） |
| `npm run auto:nodejs-compat` | 使用 API Token 自動設置（需要先設置環境變數） |

## 📝 可用的腳本文件

| 腳本 | 說明 |
|------|------|
| `scripts/setup-nodejs-compat-auto.sh` | 智能自動化設置（引導獲取 API Token） |
| `scripts/auto-set-nodejs-compat.sh` | 使用 API Token 自動設置 |
| `scripts/auto-setup-complete.sh` | 完全自動化（嘗試所有方法） |

## ⚠️ 重要提醒

1. **必須設置給兩個環境**
   - Production（生產環境）
   - Preview（預覽環境）

2. **設置後需要重新部署**
   - 設置完成後必須觸發新部署才能生效
   - 自動化腳本會嘗試自動觸發部署

3. **等待部署完成**
   - 部署通常需要 2-5 分鐘
   - 可以在 Dashboard 中查看部署進度

## 🔍 驗證設置

設置完成並重新部署後：

1. **檢查構建日誌**
   - 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
   - 查看最新部署的構建日誌
   - 應該不會有 Node.js 相關的錯誤

2. **測試網站**
   ```bash
   curl -I https://hua-sign-pri.pages.dev
   ```
   - 應該返回 HTTP 200，而不是 404

3. **檢查 Functions 設置**
   - 返回 Functions 設置頁面
   - 確認 `nodejs_compat` 顯示在 Compatibility Flags 中

## 🆘 如果遇到問題

### 問題 1: API Token 認證失敗

**錯誤訊息：**
```json
{"success":false,"errors":[{"code":9106,"message":"Missing X-Auth-Key, X-Auth-Email or Authorization headers"}]}
```

**解決方案：**
- 檢查 API Token 是否正確設置
- 確認 Token 權限包含「Cloudflare Pages: Edit」
- 或使用 Dashboard 手動設置（更簡單）

### 問題 2: 設置後仍然 404

**可能原因：**
- 設置未應用（檢查是否勾選了 Production 和 Preview）
- 未重新部署（需要觸發新部署）
- 構建失敗（檢查構建日誌）

**解決方案：**
1. 確認設置已保存
2. 觸發新部署
3. 等待 2-5 分鐘
4. 檢查構建日誌

## 📚 相關文檔

- `HOW_TO_SET_NODEJS_COMPAT.md` - 詳細的手動設置指南
- `STEP_BY_STEP_GUIDE.md` - 逐步操作指南
- `API_AUTH_FIX.md` - API 認證錯誤修復指南
- `WRANGLER_TOML_SETUP.md` - wrangler.toml 設置說明

## ✅ 總結

**最簡單的方式：**
1. 執行 `npm run setup:nodejs-compat`
2. 按照指引在 Dashboard 中手動設置
3. 觸發新部署

**完全自動化的方式：**
1. 獲取 API Token
2. 設置環境變數：`export CLOUDFLARE_API_TOKEN='your-token'`
3. 執行：`npm run auto:nodejs-compat`

設置完成後告訴我，我可以幫您檢查網站是否正常！
