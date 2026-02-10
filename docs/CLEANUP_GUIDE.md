# 專案清理指南

## 一、可安全刪除（不影響運行）

### 根目錄一次性修復 .md（約 150+ 個）
多為歷史故障排除、部署紀錄，建議移入 `docs/archive/` 或刪除：

```
404_DIAGNOSIS.md, 404_FIX_GUIDE.md, API_AUTH_FIX.md
ATTENDANCE_STATS_FIX.md, ATTENDANCE_SYNC.md, AUTO_EXECUTE_COMPLETE.md
AUTO_SETUP_NODEJS_COMPAT.md, AUTO_TEST_REPORT.md, CHECK_BUILD_LOGS.md
CHECK_DATABASE_STATUS.md, CLOUDFLARE_*.md (多個), CODE_IMPROVEMENTS*.md
COMPREHENSIVE_*.md, CRITICAL_ISSUE_FIX.md, CRUD_FIXES.md
DATABASE_*.md, DEBUG_*.md, DEPLOYMENT_*.md, DISPLAY_*.md
ERROR_TROUBLESHOOTING.md, EXECUTE_IN_SUPABASE.md, FIND_*.md
FINAL_*.md, FIX_*.md, FUNCTIONALITY_*.md, GITHUB_*.md
HOW_TO_*.md, IMAGE_*.md, INFINITY_FIX.md, INFORGE_*.md
LOTTERY_*.md, MEMBER_*.md, MIGRATE_*.md, MODULE_STRUCTURE.md
PRIZES_*.md, QUICK_*.md, RATE_LIMIT_*.md, SECRET_ALERT_FIX.md
SECURITY_AND_IMPROVEMENTS.md, SERVER_STATUS_REPORT.md
STATISTICS_IMPORT_GUIDE.md, STEP_BY_STEP_GUIDE.md, STOCK_*.md
SUCCESS_*.md, SYNC_*.md, TEST_*.md, TROUBLESHOOT_*.md
URGENT_*.md, VERCEL_*.md, VERIFICATION_REPORT.md
WINNER_*.md, WRANGLER_TOML_SETUP.md
程式碼健檢報告.md, 部署到Vercel.md, VERCEL_自動化.md
... 等（專案根目錄所有 *_FIX.md, *_REPORT.md, *_GUIDE.md 等）
```

**建議**：保留 `README.md`，其餘移入 `docs/archive/` 或刪除。

---

### 根目錄一次性 SQL 腳本
| 檔案 | 說明 |
|------|------|
| `fix_prizes_*.sql` | 一次性修復，已執行過可刪 |
| `fix_prizes_permissions*.sql` | 同上 |
| `check_database_tables.sql` | 檢查用，可刪 |
| `verify_estate_attendance_tables.sql` | 驗證用，可刪 |
| `backup_database.sql` | 備份，建議移到專案外或 `backups/` |
| `export_database_data.sql` | 匯出腳本，可保留或移入 scripts |

**保留**：`supabase/migrations/` 內的遷移檔勿刪。

---

### cursor自動化指揮官（約 9.3MB）
獨立工具，不參與主專案 build。若不需要可整目錄刪除。

---

### scripts 可考慮精簡
| 類型 | 檔案 | 說明 |
|------|------|------|
| Cloudflare 相關 | `*-cloudflare*.sh`, `wrangler*`, `setup-cloudflare*` | 若已用 Vercel 可刪 |
| 一次性修復 | `auto-fix-*.sh`, `fix-prizes-via-api.sh` | 已執行過可刪 |
| 重複測試 | `test-*.js`, `test-*.mjs`（多個） | 保留常用，其餘可刪 |
| 診斷用 | `diagnose-*.sh`, `check-*.sh`（部分） | 依需保留 |

**建議保留**：`backup-supabase.sh`, `delete-meeting-by-date.mjs`, `test-lottery-full-with-cleanup.mjs`, `cli.mjs`, `scripts/lib/`, `scripts/commands/`

---

## 二、勿刪（專案必要）

| 項目 | 說明 |
|------|------|
| `app/`, `components/`, `hooks/`, `lib/`, `types/` | 主程式碼 |
| `public/` | 靜態資源 |
| `supabase/migrations/` | 資料庫遷移 |
| `.github/` | CI/CD |
| `docs/ATTENTION_CHECKLIST.md`, `docs/OPTIMIZATION_ROADMAP.md`, `docs/REVIEW_REPORT.md` | 重要說明 |
| `next.config.js`, `tsconfig.json`, `package.json` | 設定檔 |
| `project-bundle.cjs` | package.json 有引用 |

---

## 三、建議保留的 docs

```
docs/ATTENTION_CHECKLIST.md
docs/OPTIMIZATION_ROADMAP.md
docs/REVIEW_REPORT.md
docs/DEPLOYMENT_CHECKLIST.md
docs/SYNC_AND_REFRESH.md
docs/CLI.md
README.md
```

---

## 四、執行清理（可選）

若要自動清理，可執行（執行前請先備份或確認）：

```bash
# 建立歸檔目錄
mkdir -p docs/archive

# 移動根目錄多餘 .md 到歸檔（保留 README）
mv [根目錄的 *_FIX.md *_REPORT.md 等] docs/archive/

# 刪除一次性 SQL（謹慎）
# rm fix_prizes_*.sql fix_prizes_permissions*.sql check_database_tables.sql verify_estate_attendance_tables.sql

# 若不使用 cursor自動化指揮官
# rm -rf cursor自動化指揮官
```

**注意**：刪除前建議先用 `git status` 確認，或先 commit 現況以便還原。
