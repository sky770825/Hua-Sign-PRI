#!/usr/bin/env node
/**
 * 依日期排序 → 刪除舊簽到 → 重新匯入
 * 格式：會議日期,會員編號,姓名,專業別,出席狀態,簽到時間,留言
 * 僅匯入有簽到的（出席狀態非 None）
 *
 * 使用：node scripts/import-attendance-replace.mjs file1.csv file2.csv ...
 */
import { getSupabase } from './lib/supabase.mjs'
import { runImport } from './commands/import-csv.mjs'

const FILES = [
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-08-14.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-08-21.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-08-28.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-09-04.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-09-11.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-09-18.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-09-25.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-10-02.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-10-09.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-10-16.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-10-23.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-10-30.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-11-06.csv',
  '/Users/caijunchang/Downloads/文件/會議出席表_2025-11-27.csv',
]

function parseDateFromPath(path) {
  const m = path.match(/會議出席表_(\d{4}-\d{2}-\d{2})\.csv$/i)
  return m ? m[1] : null
}

function sortByDate(files) {
  return [...files]
    .filter(p => parseDateFromPath(p))
    .sort((a, b) => {
      const da = parseDateFromPath(a)
      const db = parseDateFromPath(b)
      return (da || '').localeCompare(db || '')
    })
}

async function main() {
  const files = process.argv.length > 2 ? process.argv.slice(2) : FILES
  const sorted = sortByDate(files)

  if (sorted.length === 0) {
    console.log('無有效檔案（檔名須含 會議出席表_YYYY-MM-DD.csv）')
    process.exit(1)
  }

  const dates = sorted.map(parseDateFromPath).filter(Boolean)
  console.log('📅 依日期排序的檔案：')
  sorted.forEach((f, i) => console.log(`   ${i + 1}. ${dates[i]} - ${f.split('/').pop()}`))

  const { supabase, TABLES } = getSupabase()

  console.log('\n🗑️ 刪除舊簽到記錄...')
  const { data: deleted, error: delErr } = await supabase
    .from(TABLES.CHECKINS)
    .delete()
    .in('meeting_date', dates)
    .select('id')

  if (delErr) {
    console.error('❌ 刪除失敗:', delErr.message)
    process.exit(1)
  }
  const deletedCount = Array.isArray(deleted) ? deleted.length : 0
  console.log(`   已刪除 ${deletedCount} 筆簽到記錄`)

  console.log('\n📤 重新匯入...')
  let totalCreated = 0
  let totalSkipped = 0

  for (const f of sorted) {
    try {
      const r = await runImport(f)
      totalCreated += r.created
      totalSkipped += r.skipped
      console.log(`   ✅ ${parseDateFromPath(f)}: 新增 ${r.created} 筆`)
    } catch (e) {
      console.error(`   ❌ ${f}:`, e.message || e)
    }
  }

  console.log('\n📊 匯入總計：')
  console.log(`   新增簽到：${totalCreated} 筆`)
  console.log(`   跳過：${totalSkipped} 筆`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
