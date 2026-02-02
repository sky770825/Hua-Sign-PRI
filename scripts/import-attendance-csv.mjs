#!/usr/bin/env node
/**
 * 匯入會議出席表 CSV 到資料庫（單檔）
 * 格式：會議日期,會員編號,姓名,專業別,出席狀態,簽到時間,留言
 * 出席狀態：早安=present, 遲到=late, None=跳過(缺席)
 *
 * 使用：node scripts/import-attendance-csv.mjs /path/to/會議出席表_YYYY-MM-DD.csv
 * 或：  npm run cli -- import csv /path/to/會議出席表_YYYY-MM-DD.csv
 */

import { run } from './commands/import-csv.mjs'

const csvPath = process.argv[2]
if (!csvPath) {
  console.log('用法: node scripts/import-attendance-csv.mjs <file.csv>')
  process.exit(1)
}

run(csvPath).catch(e => {
  console.error('❌', e.message || e)
  process.exit(1)
})
