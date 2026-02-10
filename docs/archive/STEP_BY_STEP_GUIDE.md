# 逐步設置指南 - nodejs_compat

## 🎯 最簡單的方式：在 Dashboard 中手動設置

**不需要 API Token，不需要 wrangler.toml，直接在網頁中設置！**

## 📋 詳細步驟（附截圖說明）

### 步驟 1: 登入 Cloudflare Dashboard

1. 打開瀏覽器
2. 前往：https://dash.cloudflare.com
3. 登入您的帳號

### 步驟 2: 前往 Pages 專案

1. 點擊左側選單的 **「Workers & Pages」** 或 **「Pages」**
2. 點擊專案名稱：**「hua-sign-pri」**

或直接前往：
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri

### 步驟 3: 打開設置

1. 在專案頁面中，點擊左側選單的 **「Settings」**（設置）
2. 您會看到多個選項卡：
   - Builds（構建）
   - Functions（函數）← **點擊這個**
   - Environment variables（環境變數）
   - Domains（域名）
   - 等等

### 步驟 4: 找到 Compatibility Flags

在 **「Functions」** 選項卡中，您會看到：

**選項 A: 如果有「Compatibility Flags」輸入框**
- 找到標籤為「Compatibility Flags」的輸入框
- 在輸入框中輸入：`nodejs_compat`

**選項 B: 如果有「Compatibility Date」和「Flags」**
- 先設置「Compatibility Date」：`2024-09-23`
- 然後在「Flags」或「Compatibility Flags」中輸入：`nodejs_compat`

**選項 C: 如果只有「Compatibility Date」**
- 設置「Compatibility Date」：`2024-09-23`
- 然後在下方或旁邊尋找「Flags」選項
- 添加：`nodejs_compat`

### 步驟 5: 選擇環境

確保設置應用於：
- ✅ **Production**（生產環境）
- ✅ **Preview**（預覽環境）

通常會有兩個輸入框或兩個勾選框，分別對應這兩個環境。

### 步驟 6: 保存設置

1. 點擊頁面底部的 **「Save」**（保存）按鈕
2. 等待保存完成（通常會顯示「Settings saved」或「設置已保存」）

### 步驟 7: 觸發新部署

設置完成後，必須重新部署才能生效：

1. 點擊左側選單的 **「Deployments」**（部署）
2. 找到最新的部署記錄
3. 點擊部署記錄旁邊的 **「Retry deployment」**（重新部署）按鈕
4. 或點擊右上角的 **「Retry deployment」** 按鈕

### 步驟 8: 等待部署完成

1. 部署通常需要 2-5 分鐘
2. 可以在部署頁面查看構建進度
3. 構建完成後，網站應該可以正常訪問

## 🔗 直接連結

**Functions 設置頁面：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

**部署頁面：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments

## ⚠️ 如果找不到設置選項

### 可能原因 1: 頁面結構不同

Cloudflare Dashboard 的界面可能會更新。如果找不到「Functions」選項卡，請嘗試：

1. 在 Settings 頁面中尋找：
   - "Runtime"（運行時）
   - "Environment"（環境）
   - "Advanced"（高級）
   - "Compatibility"（兼容性）

2. 或使用瀏覽器的搜索功能（Ctrl+F 或 Cmd+F）搜索：
   - "compatibility"
   - "flags"
   - "nodejs"

### 可能原因 2: 需要先啟用 Functions

某些情況下，需要先啟用 Functions 功能：

1. 在 Settings 頁面中尋找 "Enable Functions" 或類似選項
2. 啟用後，Functions 設置選項才會顯示

### 可能原因 3: 使用舊版 Dashboard

如果使用的是舊版 Dashboard：

1. 嘗試切換到新版 Dashboard
2. 或尋找「Workers」相關設置（Pages Functions 基於 Workers）

## 📸 頁面結構示意

```
Cloudflare Dashboard
├── Workers & Pages
    └── Pages
        └── hua-sign-pri（您的專案）
            ├── Deployments（部署）
            ├── Settings（設置）← 點擊這裡
            │   ├── Builds（構建）
            │   ├── Functions（函數）← 點擊這裡
            │   │   └── Compatibility Flags ← 在這裡設置
            │   ├── Environment variables（環境變數）
            │   └── ...
            └── ...
```

## ✅ 驗證設置

設置完成並重新部署後：

1. **檢查構建日誌**
   - 前往部署歷史
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

## 🆘 如果仍然無法找到

請告訴我您在 Dashboard 中看到的具體選項，我可以提供更精確的指引。
