# 404 錯誤完整修復指南

## 🔍 問題確認

**所有 URL 都返回 404**，包括：
- 主網站：https://hua-sign-pri.pages.dev → 404
- 部署 URL：https://a52196c2.hua-sign-pri.pages.dev → 404 或登入頁面

## 🎯 根本原因

Cloudflare Pages **無法找到構建後的網站文件**。

這通常表示：
1. **構建輸出目錄配置錯誤**（最常見）
2. **構建失敗但狀態顯示 Active**
3. **Next.js 配置不適合 Cloudflare Pages**

## ✅ 完整修復步驟

### 步驟 1: 檢查構建日誌（必須）

**前往構建日誌：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments

**點擊最新部署（a52196c2...），查看構建日誌，確認：**

1. **構建是否成功？**
   - 查找 "Successfully deployed" 或 "Build completed"
   - 如果看到錯誤，記錄錯誤訊息

2. **構建輸出目錄是什麼？**
   - 查找 "Output directory" 或 "Deploying from"
   - 應該顯示 `.next` 或類似的目錄

3. **是否有文件上傳？**
   - 查找 "Uploading files" 或 "Files uploaded"
   - 確認有文件被上傳

### 步驟 2: 修正構建設置（關鍵）

**前往構建設置：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

#### 設置 1: 構建命令

```
npm run build:cloudflare
```

或

```
npm run build && rm -rf .next/cache
```

#### 設置 2: 構建輸出目錄 ⚠️ **最重要**

**必須設置為以下之一：**

**選項 A（推薦）**: **留空**（讓 Cloudflare 自動檢測）

**選項 B**: `.next`

**選項 C**: 如果使用靜態導出，設置為 `out`

**⚠️ 不要設置為：**
- `.next/cache` ❌
- `dist` ❌
- `build` ❌
- 其他值 ❌

#### 設置 3: Node.js 版本

```
18
```

或

```
20
```

#### 設置 4: 根目錄

留空（使用 `/`）

### 步驟 3: 檢查 Next.js 配置

確認 `next.config.js` 沒有設置 `output: 'export'`（除非您要使用靜態導出）。

當前配置應該是：
```javascript
// 不要設置 output: 'export'（除非需要靜態導出）
// output: 'export', // ❌ 不要啟用（除非需要）
```

### 步驟 4: 如果使用靜態導出（可選方案）

如果標準模式不工作，可以嘗試靜態導出：

1. **修改 `next.config.js`**:
   ```javascript
   const nextConfig = {
     output: 'export',
     // ... 其他配置
   }
   ```

2. **更新構建設置**:
   - 構建命令：`npm run build`
   - 構建輸出目錄：`out`

3. **注意**：靜態導出不支持 API 路由和服務端功能

### 步驟 5: 檢查環境變數

**前往環境變數設置：**
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

**確認已設置：**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

### 步驟 6: 觸發新部署

完成上述設置後：

1. **在 Dashboard 中點擊「重新部署」**
2. **或推送代碼**:
   ```bash
   git commit --allow-empty -m '修復 404 錯誤' && git push origin main
   ```

3. **等待 2-5 分鐘**讓構建完成

### 步驟 7: 驗證修復

構建完成後：

```bash
# 檢查網站
curl -I https://hua-sign-pri.pages.dev

# 應該返回 HTTP 200，而不是 404
```

## 🔧 診斷命令

在本地執行以下命令檢查構建：

```bash
# 清理並重新構建
rm -rf .next
npm run build:cloudflare

# 檢查構建輸出
ls -la .next/
ls -la .next/server/
ls -la .next/static/
```

## 📋 檢查清單

完成以下所有項目：

- [ ] 已查看構建日誌，確認構建成功
- [ ] 構建命令設置為 `npm run build:cloudflare`
- [ ] **構建輸出目錄留空或設置為 `.next`**（最重要！）
- [ ] Node.js 版本設置為 18 或 20
- [ ] 環境變數已正確設置（3個變數）
- [ ] 已觸發新部署
- [ ] 已等待構建完成（2-5 分鐘）
- [ ] 網站返回 HTTP 200（不是 404）

## 🆘 如果仍然 404

### 方案 1: 檢查構建日誌中的錯誤

查看構建日誌，查找：
- "Error"
- "Failed"
- "Cannot find"
- "Missing"

### 方案 2: 嘗試靜態導出

如果標準模式不工作，嘗試靜態導出（見步驟 4）。

### 方案 3: 檢查文件上傳

在構建日誌中確認：
- 有文件被上傳
- 文件數量 > 0
- 沒有 "No files to deploy" 錯誤

## 🔗 重要連結

- **構建日誌**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/deployments
- **構建設置**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds
- **環境變數**: https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/environment-variables

## 💡 關鍵提示

**最常見的錯誤是構建輸出目錄設置錯誤！**

- ✅ 正確：留空（自動檢測）
- ✅ 正確：`.next`
- ❌ 錯誤：`.next/cache`
- ❌ 錯誤：`dist`
- ❌ 錯誤：其他值

**如果構建日誌顯示構建成功但網站仍 404，99% 是構建輸出目錄配置錯誤！**
