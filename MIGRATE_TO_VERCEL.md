# 遷移到 Vercel - 完整指南

## 🎯 為什麼遷移到 Vercel？

### ✅ 優勢

1. **不需要設置 `nodejs_compat`**
   - Vercel 對 Next.js 有原生支持
   - 不需要任何 Compatibility Flags

2. **部署更簡單**
   - 連接 GitHub 倉庫即可
   - 自動檢測構建配置
   - 一鍵部署

3. **更好的 Next.js 支持**
   - Vercel 是 Next.js 的創建者
   - 完美支持所有 Next.js 功能
   - 自動優化

4. **更快的問題解決**
   - 不需要處理 Cloudflare Pages 的配置問題
   - 可以立即解決當前的 404 問題

## 🚀 遷移步驟（5-10 分鐘）

### 步驟 1: 登入 Vercel

1. 前往：https://vercel.com
2. 點擊 **"Sign Up"** 或 **"Log In"**
3. 選擇 **"Continue with GitHub"**
4. 授權 Vercel 訪問您的 GitHub 帳號

### 步驟 2: 導入專案

1. 登入後，點擊 **"Add New..."** → **"Project"**
2. 在 "Import Git Repository" 中，找到 **`sky770825/Hua-Sign-PRI`**
3. 點擊 **"Import"**

### 步驟 3: 配置專案（通常自動完成）

Vercel 會自動檢測 Next.js 並配置：

- **Framework Preset**: Next.js ✅（自動）
- **Root Directory**: `./` ✅（自動）
- **Build Command**: `next build` ✅（自動）
- **Output Directory**: `.next` ✅（自動）
- **Install Command**: `npm install` ✅（自動）

**通常不需要修改任何設置！**

### 步驟 4: 設置環境變數

在專案設置中添加環境變數：

1. 在導入頁面，點擊 **"Environment Variables"**
2. 添加以下 3 個環境變數：

#### 環境變數 1:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://sqgrnowrcvspxhuudrqc.supabase.co`
- **Environment**: 勾選 Production、Preview、Development

#### 環境變數 2:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw`
- **Environment**: 勾選 Production、Preview、Development

#### 環境變數 3:
- **Name**: `SUPABASE_SERVICE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw`
- **Environment**: 勾選 Production、Preview、Development

3. 點擊 **"Save"** 保存每個環境變數

### 步驟 5: 部署

1. 點擊 **"Deploy"** 按鈕
2. 等待 2-5 分鐘
3. 部署完成後，您會看到：
   - ✅ 部署成功
   - 🌐 網站 URL（例如：`hua-sign-pri.vercel.app`）

**完成！**

## ✅ 部署完成後

### 檢查網站

訪問您的網站：
- 主網站：`https://您的專案名稱.vercel.app`
- 簽到頁面：`https://您的專案名稱.vercel.app/checkin`
- 抽獎轉盤：`https://您的專案名稱.vercel.app/lottery`
- 後台登入：`https://您的專案名稱.vercel.app/admin/login`

### 自動部署

之後每次您推送到 GitHub 的 `main` 分支，Vercel 會：
- ✅ 自動檢測推送
- ✅ 自動構建
- ✅ 自動部署
- ✅ 發送通知（可選）

## 🔧 可選：移除 Cloudflare Pages 連接

如果您不再需要 Cloudflare Pages：

1. 前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri
2. 前往 Settings
3. 找到 "Git Repository" 設置
4. 點擊 "Disconnect" 或刪除專案

## 📋 遷移檢查清單

- [ ] 已登入 Vercel
- [ ] 已導入 GitHub 倉庫
- [ ] 已設置 3 個環境變數
- [ ] 已點擊 Deploy
- [ ] 已等待部署完成
- [ ] 已測試網站是否正常
- [ ] 已確認所有功能正常

## 🎯 預期結果

遷移後，您應該：
- ✅ 網站可以正常訪問（不再 404）
- ✅ 所有功能正常運作
- ✅ 不再需要處理 `nodejs_compat`
- ✅ 不再需要處理複雜配置
- ✅ 獲得更好的開發體驗

## 🔗 相關連結

- **Vercel 首頁**: https://vercel.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel 文檔**: https://vercel.com/docs
- **Next.js 文檔**: https://nextjs.org/docs

## ✅ 總結

**遷移到 Vercel 是最簡單的解決方案！**

- ✅ 不需要設置 `nodejs_compat`
- ✅ 不需要複雜配置
- ✅ 一鍵部署
- ✅ 立即解決 404 問題

**建議立即遷移，5-10 分鐘即可完成！**
