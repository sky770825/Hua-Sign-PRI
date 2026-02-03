#!/usr/bin/env node
/**
 * 批次匯入多個會議出席表 CSV
 * 格式：會議日期,會員編號,姓名,專業別,出席狀態,簽到時間,留言
 * 僅匯入有簽到的（出席狀態非 None）
 *
 * 使用：node scripts/import-attendance-batch.mjs file1.csv file2.csv ...
 * 或：  node scripts/import-attendance-batch.mjs /path/to/*.csv
 */
import { runImport } from './commands/import-csv.mjs'

const files = process.argv.slice(2).filter(Boolean)
if (files.length === 0) {
  console.log('用法: node scripts/import-attendance-batch.mjs <file1.csv> [file2.csv] ...')
  console.log('範例: node scripts/import-attendance-batch.mjs 會議出席表_*.csv')
  process.exit(1)
}

async function main() {
  let totalCreated = 0
  let totalSkipped = 0
  const results = []

  for (const f of files) {
    try {
      const r = await runImport(f)
      totalCreated += r.created
      totalSkipped += r.skipped
      results.push({ file: f, ...r })
      console.log(`✅ ${f}: 新增 ${r.created} 筆，跳過 ${r.skipped} 筆`)
    } catch (e) {
      console.error(`❌ ${f}:`, e.message || e)
      results.push({ file: f, error: e.message })
    }
  }

  console.log('\n📊 匯入總計：')
  console.log(`   新增簽到：${totalCreated} 筆`)
  console.log(`   已存在／跳過：${totalSkipped} 筆`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
