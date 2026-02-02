#!/usr/bin/env node
/**
 * 批次匯入多個會議出席表 CSV
 *
 * 使用：node scripts/import-attendance-batch.mjs file1.csv file2.csv ...
 * 或：  npm run cli -- import batch file1.csv file2.csv ...
 */

import { run } from './commands/import-batch.mjs'

const files = process.argv.slice(2).filter(Boolean)
if (files.length === 0) {
  console.log('用法: node scripts/import-attendance-batch.mjs <csv1> [csv2 ...]')
  process.exit(1)
}

run(files).catch(e => {
  console.error('❌', e.message || e)
  process.exit(1)
})
