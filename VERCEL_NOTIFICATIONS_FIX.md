# Vercel 通知問題處理

## 🔍 問題說明

您一直收到 Vercel 的訊息，但網站實際部署在 Cloudflare Pages。

## 📋 可能的原因

### 1. 專案同時連接到 Vercel 和 Cloudflare Pages

如果您的 GitHub 倉庫同時連接到：
- Vercel（自動部署）
- Cloudflare Pages（自動部署）

兩個平台都會在您推送代碼時自動部署，導致：
- Vercel 發送部署通知
- Cloudflare Pages 發送部署通知

### 2. 之前的 Vercel 專案未移除

如果之前創建過 Vercel 專案但未移除，Vercel 會繼續：
- 監聽 GitHub 推送
- 嘗試自動部署
- 發送通知

## ✅ 解決方案

### 方案 1: 移除 Vercel 連接（推薦）

如果您只想使用 Cloudflare Pages：

1. **登入 Vercel Dashboard**
   - 前往：https://vercel.com/dashboard
   - 使用 GitHub 帳號登入

2. **找到專案**
   - 搜索 `Hua-Sign-PRI` 或 `hua-sign-pri`
   - 或查看所有專案列表

3. **刪除專案或移除 GitHub 連接**
   - 點擊專案
   - 前往 Settings → Git Repository
   - 點擊 "Disconnect" 或 "Remove"
   - 或直接刪除整個專案

4. **確認移除**
   - 確認 Vercel 不再監聽 GitHub 推送
   - 之後就不會再收到 Vercel 通知

### 方案 2: 禁用 Vercel 通知

如果不想移除 Vercel 連接，只想停止通知：

1. **登入 Vercel Dashboard**
   - 前往：https://vercel.com/dashboard

2. **前往通知設置**
   - 點擊右上角頭像 → Settings
   - 找到 Notifications 或通知設置

3. **禁用部署通知**
   - 關閉 "Deployment notifications"
   - 或調整通知偏好設置

### 方案 3: 保留兩個平台（不推薦）

如果您想同時使用兩個平台：
- Vercel 會自動部署到 `*.vercel.app`
- Cloudflare Pages 會自動部署到 `*.pages.dev`
- 兩個平台都會發送通知

**不推薦**，因為：
- 會造成混淆
- 浪費構建資源
- 收到雙重通知

## 🔍 如何確認 Vercel 連接

### 檢查方法 1: Vercel Dashboard

1. 前往：https://vercel.com/dashboard
2. 查看是否有 `Hua-Sign-PRI` 或類似名稱的專案
3. 如果有，就是已連接

### 檢查方法 2: GitHub 設置

1. 前往：https://github.com/sky770825/Hua-Sign-PRI/settings/installations
2. 查看已安裝的 GitHub Apps
3. 查看是否有 Vercel
4. 如果有，可以點擊 Configure 查看連接的倉庫

### 檢查方法 3: 查看部署歷史

1. 前往：https://vercel.com/dashboard
2. 查看是否有部署記錄
3. 如果有最近的部署記錄，就是已連接

## ✅ 確認 nodejs_compat 設置

您說已經輸入了 `nodejs_compat`，讓我確認：

### 檢查步驟：

1. **前往 Cloudflare Pages Functions 設置**
   - https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions

2. **確認設置**
   - 應該看到 `nodejs_compat` 在 Compatibility Flags 中
   - 應該勾選了 Production 和 Preview

3. **觸發新部署**
   - 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
   - 點擊 "Retry deployment" 或 "重新部署"

4. **等待部署完成**
   - 通常需要 2-5 分鐘
   - 檢查部署狀態是否為 "Success"

5. **測試網站**
   - 訪問：https://hua-sign-pri.pages.dev
   - 應該返回 HTTP 200，而不是 404

## 🎯 建議操作

### 立即操作：

1. **移除 Vercel 連接**（如果不需要）
   - 前往 Vercel Dashboard
   - 刪除或斷開專案連接

2. **確認 nodejs_compat 設置**
   - 檢查 Cloudflare Pages Functions 設置
   - 確認已正確設置

3. **觸發新部署**
   - 在 Cloudflare Pages 中觸發新部署
   - 等待部署完成

4. **測試網站**
   - 訪問網站確認是否正常

## 📋 檢查清單

- [ ] 已檢查 Vercel Dashboard 是否有專案連接
- [ ] 已移除 Vercel 連接（如果不需要）
- [ ] 已確認 nodejs_compat 在 Cloudflare Pages 中設置
- [ ] 已觸發新部署
- [ ] 已等待部署完成
- [ ] 已測試網站是否正常（HTTP 200）

## 🔗 相關連結

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Cloudflare Pages Functions 設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
- **Cloudflare Pages 部署**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
- **網站**: https://hua-sign-pri.pages.dev
