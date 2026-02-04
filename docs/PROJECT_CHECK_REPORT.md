# 專案檢查報告

> 檢查日期：2026-02-04

## ✅ 通過項目

| 項目 | 狀態 | 說明 |
|------|------|------|
| **Build** | ✅ 成功 | `npm run build` 可正常完成 |
| **Lint** | ✅ 通過 | 改用 `eslint .` 取代有 bug 的 `next lint` |
| **GitHub Actions** | ✅ 正確 | 僅保留 `deploy.yml`（Node 20） |
| **Node 版本** | ✅ 20.x | package.json engines 已指定 |
| **Vercel 配置** | ✅ 正確 | vercel.json 設定適當 |

## 🔧 本次修正

1. **Lint 問題**：`next lint` 在 Next.js 16 有 directory 解析 bug，改為直接使用 `eslint .`
2. **ESLint 設定**：新增 `.eslintrc.json`、`.eslintignore`
3. **next.config.js**：移除 Cloudflare 相關註解，簡化設定
4. **Cloudflare workflow**：已移除（僅使用 Vercel）

## ⚠️ 可選後續優化

- ESLint 有 12 個 warning（主要是 `<img>` 建議改 `next/image`、hook dependencies）
- package.json 仍有多個 Cloudflare 相關 scripts（可保留備用，不影響 Vercel 部署）
- 建議定期執行 `npm audit` 檢查套件漏洞

## 部署流程

- **Vercel**：push 到 main → Vercel 自動 build & deploy
- **GitHub Actions**：push/PR 到 main → 執行 build + lint（驗證通過）
