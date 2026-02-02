#!/usr/bin/env node
/**
 * 華地產簽到系統 - 全域自動化 CLI
 *
 * 使用：node scripts/cli.mjs <command> [args...]
 *  或：npm run cli -- <command> [args...]
 *
 * 命令：
 *   import csv <file>              匯入單一會議出席表 CSV
 *   import batch <file...>         批次匯入多個 CSV
 *   db delete-meetings-before <date> 刪除該日期之前的會議與簽到、抽獎
 *   verify stats [baseUrl]         驗證統計 API
 *   verify prizes [baseUrl]        驗證獎品 CRUD API
 *   check attendance-stats          診斷出席統計（會議/簽到數）
 *   test lottery [date]            抽獎 10 次後刪除中獎紀錄（需 dev server）
 *   test e2e [baseUrl]              E2E 測試流程
 *   run <script> [args...]          執行 scripts 下既有腳本（如 deploy-cloudflare.sh）
 */

import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const HELP = `
華地產簽到系統 CLI

用法:  node scripts/cli.mjs <command> [args...]
  或:  npm run cli -- <command> [args...]

資料 / 匯入
  import csv <file>                匯入單一會議出席表 CSV
  import batch <file1> [file2 ...]  批次匯入多個 CSV

資料庫
  db delete-meetings-before <date>   刪除該日期之前的會議、簽到、抽獎（預設 2025-08-14）

驗證 / 檢查
  verify stats [baseUrl]            驗證 /api/statistics/member-attendance（預設 http://localhost:3000）
  verify prizes [baseUrl]           驗證獎品 CRUD API
  check attendance-stats             診斷出席統計（會議數、簽到數）

測試
  test lottery [date]               抽獎 10 次後刪除中獎紀錄（需先 npm run dev）
  test e2e [baseUrl]                E2E 測試流程

其他
  run <scriptName> [args...]        執行 scripts/<scriptName>（.mjs 或 .sh）
  help                              顯示此說明
`

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  const sub = argv[1]
  const rest = argv.slice(2)

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP.trim())
    return
  }

  try {
    if (cmd === 'import') {
      if (sub === 'csv') {
        const { run } = await import('./commands/import-csv.mjs')
        await run(rest[0])
      } else if (sub === 'batch') {
        const { run } = await import('./commands/import-batch.mjs')
        await run(rest.filter(Boolean))
      } else {
        console.log('子命令: csv | batch')
        console.log('  cli import csv <file>')
        console.log('  cli import batch <file...>')
      }
      return
    }

    if (cmd === 'db') {
      if (sub === 'delete-meetings-before') {
        const { run } = await import('./commands/db-delete-meetings.mjs')
        await run(rest[0])
      } else {
        console.log('子命令: delete-meetings-before <date>')
      }
      return
    }

    if (cmd === 'verify') {
      if (sub === 'stats') {
        const { run } = await import('./commands/verify-stats.mjs')
        await run(rest[0])
      } else if (sub === 'prizes') {
        await runScript('verify-prizes-crud.mjs', rest)
      } else {
        console.log('子命令: stats [baseUrl] | prizes [baseUrl]')
      }
      return
    }

    if (cmd === 'check') {
      if (sub === 'attendance-stats') {
        await runScript('check-attendance-stats.mjs', [])
      } else {
        console.log('子命令: attendance-stats')
      }
      return
    }

    if (cmd === 'test') {
      if (sub === 'lottery') {
        await runScript('test-lottery-10-draws.mjs', rest)
      } else if (sub === 'e2e') {
        await runScript('e2e-test-flow.mjs', rest)
      } else {
        console.log('子命令: lottery [date] | e2e [baseUrl]')
      }
      return
    }

    if (cmd === 'run') {
      const scriptName = sub
      if (!scriptName) {
        console.log('用法: cli run <scriptName> [args...]')
        console.log('例: cli run deploy-cloudflare.sh')
        return
      }
      await runScript(scriptName, rest)
      return
    }

    console.log('未知命令:', cmd)
    console.log(HELP.trim())
    process.exitCode = 1
  } catch (e) {
    console.error('❌', e.message || e)
    process.exitCode = 1
  }
}

function runScript(scriptName, args) {
  const scriptPath = resolve(__dirname, scriptName)
  const isSh = scriptName.endsWith('.sh')
  const child = spawn(
    isSh ? 'bash' : 'node',
    isSh ? [scriptPath, ...args] : [scriptPath, ...args],
    { stdio: 'inherit', cwd: projectRoot }
  )
  return new Promise((resolvePromise, reject) => {
    child.on('close', code => {
      if (code !== 0) reject(new Error(`腳本結束碼 ${code}`))
      else resolvePromise()
    })
    child.on('error', reject)
  })
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
