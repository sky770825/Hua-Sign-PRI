# 如何設置 nodejs_compat Compatibility Flag

## 📍 設置位置

**前往 Functions 設置頁面：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

## 🔧 詳細步驟

### 步驟 1: 打開 Functions 設置

1. 登入 Cloudflare Dashboard
2. 前往 Pages 專案：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri
3. 點擊左側選單的 **「Settings」**（設置）
4. 在設置頁面中，點擊 **「Functions」**（函數）選項卡

### 步驟 2: 找到 Compatibility Flags

在 Functions 設置頁面中，您會看到：

- **Compatibility Flags** 或 **Compatibility Date** 選項
- 可能顯示為一個輸入框或下拉選單
- 標籤可能是 "Compatibility Flags" 或 "Flags"

### 步驟 3: 添加 nodejs_compat

1. 在 **Compatibility Flags** 輸入框中，輸入：
   ```
   nodejs_compat
   ```

2. 或者如果有多個標誌，用逗號分隔：
   ```
   nodejs_compat
   ```

3. **重要**：確保同時設置給：
   - ✅ **Production**（生產環境）
   - ✅ **Preview**（預覽環境）

### 步驟 4: 保存設置

1. 點擊 **「Save」**（保存）按鈕
2. 等待設置保存完成

### 步驟 5: 觸發新部署

設置完成後，需要觸發新部署才能生效：

1. 前往 **「Deployments」**（部署）頁面
2. 點擊最新部署旁邊的 **「Retry deployment」**（重新部署）按鈕
3. 或推送代碼觸發自動部署

## 📸 視覺指引

### 頁面路徑
```
Cloudflare Dashboard
  → Pages
    → hua-sign-pri（您的專案）
      → Settings（設置）
        → Functions（函數）選項卡
          → Compatibility Flags（兼容性標誌）
```

### 設置位置示意

```
┌─────────────────────────────────────┐
│  Functions Settings                 │
├─────────────────────────────────────┤
│                                     │
│  Compatibility Flags:              │
│  ┌─────────────────────────────┐   │
│  │ nodejs_compat               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Apply to:                          │
│  ☑ Production                      │
│  ☑ Preview                         │
│                                     │
│  [ Save ]                           │
└─────────────────────────────────────┘
```

## ⚠️ 重要注意事項

1. **必須設置給兩個環境**
   - Production（生產環境）
   - Preview（預覽環境）

2. **設置後需要重新部署**
   - 設置不會立即生效
   - 必須觸發新部署

3. **如果找不到 Functions 設置**
   - 確認您使用的是 Cloudflare Pages（不是 Workers）
   - 確認專案已創建並連接 Git
   - 嘗試刷新頁面

## 🔗 直接連結

**Functions 設置頁面：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

## ✅ 驗證設置

設置完成後，可以通過以下方式驗證：

1. **檢查設置頁面**
   - 返回 Functions 設置頁面
   - 確認 `nodejs_compat` 顯示在 Compatibility Flags 中

2. **檢查構建日誌**
   - 前往部署歷史
   - 查看最新部署的構建日誌
   - 應該不會有 Node.js 相關的錯誤

3. **測試網站**
   - 等待部署完成後
   - 訪問 https://hua-sign-pri.pages.dev
   - 應該返回 HTTP 200，而不是 404

## 🆘 如果找不到設置選項

### 可能原因 1: 頁面結構不同

Cloudflare Dashboard 的界面可能會更新，如果找不到 "Functions" 選項卡，請嘗試：

1. 在 Settings 頁面中尋找：
   - "Runtime"（運行時）
   - "Environment"（環境）
   - "Advanced"（高級）

2. 或者直接在 Settings 頁面中搜索：
   - "compatibility"
   - "flags"
   - "nodejs"

### 可能原因 2: 需要先啟用 Functions

某些情況下，需要先啟用 Functions 功能：

1. 在 Settings 頁面中尋找 "Enable Functions" 或類似選項
2. 啟用後，Functions 設置選項才會顯示

### 可能原因 3: 使用 API 設置

如果 Dashboard 中找不到，可以使用 Cloudflare API：

```bash
# 需要 CLOUDFLARE_API_TOKEN 和 ACCOUNT_ID
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/projects/hua-sign-pri" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "compatibility_flags": ["nodejs_compat"]
      },
      "preview": {
        "compatibility_flags": ["nodejs_compat"]
      }
    }
  }'
```

## 📋 完整檢查清單

- [ ] 已前往 Functions 設置頁面
- [ ] 已找到 Compatibility Flags 輸入框
- [ ] 已輸入 `nodejs_compat`
- [ ] 已勾選 Production（生產環境）
- [ ] 已勾選 Preview（預覽環境）
- [ ] 已點擊 Save（保存）
- [ ] 已觸發新部署
- [ ] 已等待構建完成（2-5 分鐘）
- [ ] 已驗證網站可以訪問（HTTP 200）
