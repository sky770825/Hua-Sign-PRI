# Cloudflare Pages 部署修復指南

## 🎯 目標
確保 **https://hua-sign-pri.pages.dev/** 可以正常訪問

## 🚀 快速修復

### 方法 1: 使用自動化腳本（推薦）

```bash
npm run fix:cloudflare
```

這個腳本會：
1. 檢查網站狀態
2. 自動提交並推送代碼到 GitHub
3. 檢查專案設置
4. 提供清晰的修復步驟

### 方法 2: 手動修復

## 📋 必須完成的步驟

### 步驟 1: 連接 Git 倉庫 ⚠️ **必須完成**

1. 前往 Cloudflare Pages Dashboard：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri

2. 如果看到「連接 Git 倉庫」按鈕，點擊它

3. 選擇 GitHub 並授權

4. 選擇倉庫：`sky770825/Hua-Sign-PRI`

5. 選擇分支：`main`

6. 點擊「開始設置」

### 步驟 2: 設置環境變數 ⚠️ **必須完成**

1. 前往環境變數設置頁面：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

2. 點擊「添加變數」

3. 添加以下三個環境變數：

   **變數 1:**
   - 名稱：`NEXT_PUBLIC_SUPABASE_URL`
   - 值：`https://sqgrnowrcvspxhuudrqc.supabase.co`
   - 環境：選擇「生產」和「預覽」

   **變數 2:**
   - 名稱：`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 值：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw`
   - 環境：選擇「生產」和「預覽」

   **變數 3:**
   - 名稱：`SUPABASE_SERVICE_KEY`
   - 值：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw`
   - 環境：選擇「生產」和「預覽」

4. 保存所有變數

### 步驟 3: 檢查構建設置

1. 前往構建設置頁面：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

2. 確認以下設置：
   - **構建命令**：`npm run build`
   - **構建輸出目錄**：`.next`
   - **Node.js 版本**：`18`
   - **根目錄**：留空（使用 `/`）

3. 如果設置不正確，請修改並保存

### 步驟 4: 觸發部署

完成上述步驟後，有兩種方式觸發部署：

**方式 1: 自動觸發（推薦）**
- 如果 Git 倉庫已連接，推送代碼到 `main` 分支會自動觸發部署
- 執行：`git push origin main`

**方式 2: 手動觸發**
- 在 Dashboard 中點擊「重新部署」

### 步驟 5: 等待部署完成

1. 前往部署頁面查看構建進度：
   https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments

2. 等待構建完成（通常需要 2-5 分鐘）

3. 構建成功後，網站應該可以訪問

## 🔍 檢查網站狀態

### 使用腳本檢查

```bash
bash scripts/check-cloudflare-status.sh
```

### 手動檢查

訪問：https://hua-sign-pri.pages.dev/

如果看到網站內容，表示部署成功！

## ❌ 常見問題

### 問題 1: 網站顯示 404

**原因：**
- Git 倉庫未連接
- 構建失敗
- 環境變數未設置

**解決方法：**
1. 檢查 Git 倉庫是否已連接
2. 查看構建日誌是否有錯誤
3. 確認環境變數已正確設置

### 問題 2: 構建失敗

**可能原因：**
- 環境變數缺失
- Node.js 版本不正確
- 構建命令錯誤

**解決方法：**
1. 檢查構建日誌
2. 確認環境變數已設置
3. 確認 Node.js 版本為 18

### 問題 3: 網站可以訪問但功能不正常

**可能原因：**
- 環境變數值錯誤
- API 連接問題

**解決方法：**
1. 檢查環境變數值是否正確
2. 檢查 Supabase 連接

## 📊 檢查清單

完成以下所有項目後，網站應該可以正常訪問：

- [ ] Git 倉庫已連接
- [ ] 環境變數已設置（3個變數）
- [ ] 構建設置正確
- [ ] 代碼已推送到 GitHub
- [ ] 部署已觸發
- [ ] 構建成功完成
- [ ] 網站可以訪問（HTTP 200）

## 🆘 需要幫助？

如果完成所有步驟後網站仍無法訪問：

1. 檢查構建日誌中的錯誤訊息
2. 確認所有環境變數值正確
3. 確認 Git 倉庫連接正常
4. 嘗試重新部署

## 🔗 重要連結

- **Dashboard**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri
- **環境變數**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables
- **構建設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds
- **部署歷史**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
- **網站 URL**: https://hua-sign-pri.pages.dev/
