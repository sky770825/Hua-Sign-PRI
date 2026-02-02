# API 認證錯誤修復

## ❌ 錯誤訊息

```json
{
  "success": false,
  "errors": [{
    "code": 9106,
    "message": "Missing X-Auth-Key, X-Auth-Email or Authorization headers"
  }]
}
```

## 🔍 問題說明

這個錯誤表示 API 請求缺少認證資訊。有兩種解決方案：

## ✅ 解決方案 1: 在 Dashboard 中手動設置（推薦，最簡單）

**不需要 API Token，直接在網頁中設置：**

### 步驟：

1. **前往 Functions 設置頁面：**
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

2. **找到 Compatibility Flags 輸入框**

3. **輸入：** `nodejs_compat`

4. **確保勾選：**
   - ✅ Production（生產環境）
   - ✅ Preview（預覽環境）

5. **點擊「Save」保存**

6. **觸發新部署**

**這是最簡單的方式，不需要任何 API Token！**

## ✅ 解決方案 2: 使用 API（需要 API Token）

如果您想使用 API 設置，需要先獲取 API Token：

### 步驟 1: 獲取 API Token

1. 前往：https://dash.cloudflare.com/profile/api-tokens
2. 點擊「Create Token」（創建令牌）
3. 選擇「Edit Cloudflare Workers」模板
4. 或自定義權限：
   - Account: Cloudflare Pages: Edit
   - Zone: 不需要（Pages 是 Account 級別）
5. 點擊「Continue to summary」
6. 點擊「Create Token」
7. **複製 Token**（只顯示一次，請保存）

### 步驟 2: 設置環境變數

```bash
export CLOUDFLARE_API_TOKEN='your-api-token-here'
```

### 步驟 3: 執行設置腳本

```bash
bash scripts/set-nodejs-compat.sh
```

## 🎯 推薦方案

**強烈推薦使用方案 1（Dashboard 手動設置）**，因為：
- ✅ 不需要 API Token
- ✅ 操作簡單直觀
- ✅ 可以立即看到設置結果
- ✅ 不需要額外配置

## 📋 完整步驟（Dashboard 手動設置）

1. **登入 Cloudflare Dashboard**
   - 前往：https://dash.cloudflare.com

2. **前往 Pages 專案**
   - 點擊左側選單「Pages」
   - 點擊專案「hua-sign-pri」

3. **打開設置**
   - 點擊左側選單「Settings」（設置）

4. **找到 Functions 設置**
   - 點擊「Functions」（函數）選項卡
   - 或直接前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

5. **設置 Compatibility Flags**
   - 找到「Compatibility Flags」輸入框
   - 輸入：`nodejs_compat`
   - 確保勾選 Production 和 Preview

6. **保存並部署**
   - 點擊「Save」（保存）
   - 前往「Deployments」頁面
   - 點擊「Retry deployment」（重新部署）

## 🔗 直接連結

**Functions 設置頁面：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

## ⚠️ 重要提醒

- 設置後必須重新部署才能生效
- 必須設置給 Production 和 Preview 兩個環境
- 這是修復 404 錯誤的關鍵設置
