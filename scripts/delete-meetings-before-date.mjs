#!/usr/bin/env node
/**
 * 刪除指定日期之前的會議及相關資料（簽到、抽獎、會議）
 *
 * 使用：node scripts/delete-meetings-before-date.mjs [日期]
 * 預設：2025-08-14
 * 或：  npm run cli -- db delete-meetings-before [日期]
 */

import { run } from './commands/db-delete-meetings.mjs'

const date = process.argv[2]
run(date).catch(e => {
  console.error('❌', e.message || e)
  process.exit(1)
})
