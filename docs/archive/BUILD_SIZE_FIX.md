# 構建大小修復指南

## 🔍 問題診斷

### 構建日誌顯示的錯誤

```
Error: Pages only supports files up to 25 MiB in size
cache/webpack/server-production/0.pack is 358 MiB in size
```

### 問題分析

1. **構建成功** ✅
   - Next.js 構建完成
   - 所有頁面生成成功

2. **部署失敗** ❌
   - `.next/cache/webpack/server-production/0.pack` 文件太大（358 MiB）
   - Cloudflare Pages 限制：單個文件最大 25 MiB
   - 緩存文件不應該被部署

## ✅ 解決方案

### 方案 1: 修改構建命令（推薦）

在 Cloudflare Pages Dashboard 中，將構建命令改為：

```bash
npm run build:cloudflare
```

這個命令會在構建後自動清理緩存目錄。

### 方案 2: 使用清理腳本

在構建命令中添加清理步驟：

```bash
npm run build && bash scripts/clean-build.sh
```

### 方案 3: 使用 .cloudflareignore

已創建 `.cloudflareignore` 文件，排除緩存目錄：

```
.next/cache
.next/cache/webpack
.next/cache/webpack/server-production
.next/cache/webpack/client-production
```

## 🔧 立即修復步驟

### 步驟 1: 更新 Cloudflare Pages 構建命令

前往：https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/builds

**將構建命令從：**
```
npm run build
```

**改為：**
```
npm run build:cloudflare
```

或者：
```
npm run build && rm -rf .next/cache
```

### 步驟 2: 觸發新部署

1. 在 Dashboard 中點擊「重新部署」
2. 或推送代碼觸發自動部署：
   ```bash
   git commit --allow-empty -m '修復構建大小問題' && git push origin main
   ```

### 步驟 3: 驗證部署

等待構建完成後，檢查：
- 構建日誌中沒有文件大小錯誤
- 網站可以正常訪問

## 📊 技術細節

### 為什麼會產生大緩存文件？

- Next.js 在構建時會生成 webpack 緩存
- 這些緩存用於加速本地開發和後續構建
- 但在 Cloudflare Pages 部署時不需要這些緩存

### 緩存文件位置

```
.next/
  cache/
    webpack/
      server-production/
        0.pack (358 MiB) ❌ 太大
      client-production/
        ...
```

### 清理後的結構

```
.next/
  static/          ✅ 需要部署
  server/          ✅ 需要部署
  cache/           ❌ 已刪除（不需要）
```

## ⚠️ 注意事項

1. **構建時間可能增加**
   - 清理緩存後，每次構建都是全新構建
   - 但可以避免部署失敗

2. **本地開發不受影響**
   - `npm run dev` 仍然使用緩存
   - 只有生產構建會清理緩存

3. **構建輸出目錄**
   - 保持為 `.next`（不變）
   - 只是移除了 `cache` 子目錄

## 🔗 相關文件

- `.cloudflareignore` - Cloudflare Pages 忽略文件
- `scripts/clean-build.sh` - 清理構建緩存腳本
- `package.json` - 新增 `build:cloudflare` 命令

## ✅ 驗證清單

完成以下步驟後，網站應該可以正常部署：

- [ ] 已更新構建命令為 `npm run build:cloudflare`
- [ ] 已觸發新部署
- [ ] 構建日誌中沒有文件大小錯誤
- [ ] 網站可以正常訪問
