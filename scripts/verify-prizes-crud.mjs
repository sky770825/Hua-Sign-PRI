#!/usr/bin/env node
/**
 * 驗證獎品資料庫 CRUD 是否正常
 * 測試：新增 → 查詢 → 刪除
 * 使用：node scripts/verify-prizes-crud.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

try {
  const envPath = resolve(projectRoot, '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const [key, ...valParts] = line.split('=')
    if (key && valParts.length) {
      const val = valParts.join('=').trim().replace(/^["']|["']$/g, '')
      process.env[key.trim()] = val
    }
  })
} catch (e) { console.warn('無法讀取 .env.local') }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ 請設定 SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const TABLES = { PRIZES: 'estate_attendance_prizes' }

async function main() {
  console.log('🔍 驗證獎品 CRUD...\n')

  // 1. 新增測試獎品
  const testName = `測試獎品_${Date.now()}`
  const { data: inserted, error: insertErr } = await supabase
    .from(TABLES.PRIZES)
    .insert({
      name: testName,
      total_quantity: 5,
      remaining_quantity: 5,
      probability: 1.0,
    })
    .select('id, name')
    .single()

  if (insertErr) {
    console.error('❌ 新增失敗:', insertErr.message)
    process.exit(1)
  }
  console.log('✅ 新增成功:', inserted.name, '(id:', inserted.id, ')')

  // 2. 查詢確認
  const { data: found, error: fetchErr } = await supabase
    .from(TABLES.PRIZES)
    .select('*')
    .eq('id', inserted.id)
    .single()

  if (fetchErr || !found) {
    console.error('❌ 查詢失敗:', fetchErr?.message || '未找到')
    process.exit(1)
  }
  console.log('✅ 查詢成功: 剩餘', found.remaining_quantity, '/', found.total_quantity)

  // 3. 刪除測試獎品
  const { error: deleteErr } = await supabase
    .from(TABLES.PRIZES)
    .delete()
    .eq('id', inserted.id)

  if (deleteErr) {
    console.error('❌ 刪除失敗:', deleteErr.message)
    process.exit(1)
  }
  console.log('✅ 刪除成功')

  console.log('\n🎉 獎品 CRUD 驗證通過')
}

main().catch(e => {
  console.error('❌', e)
  process.exit(1)
})
