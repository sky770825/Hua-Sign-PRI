#!/usr/bin/env node
/**
 * 隨機新增 5 個獎品種子資料
 * 使用：node scripts/seed-prizes.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// 載入 .env.local
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
} catch (e) {
  console.warn('無法讀取 .env.local，使用環境變數')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ 請設定 SUPABASE_SERVICE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const TABLES = { PRIZES: 'estate_attendance_prizes' }

// 隨機 5 個獎品（包含初始庫存）
const PRIZE_TEMPLATES = [
  { name: '星巴克禮券 100 元', total: 10 },
  { name: '7-11 商品卡 50 元', total: 20 },
  { name: '便利商店咖啡兌換券', total: 15 },
  { name: '精美筆記本', total: 25 },
  { name: '環保杯', total: 8 },
]

async function main() {
  console.log('🎁 開始新增 5 個隨機獎品...\n')

  for (const p of PRIZE_TEMPLATES) {
    const { data, error } = await supabase
      .from(TABLES.PRIZES)
      .insert({
        name: p.name,
        total_quantity: p.total,
        remaining_quantity: p.total,
        probability: 1.0,
      })
      .select('id, name, total_quantity, remaining_quantity')
      .single()

    if (error) {
      console.error(`❌ 新增失敗 [${p.name}]:`, error.message)
    } else {
      console.log(`✅ 已新增: ${data.name} (庫存 ${data.remaining_quantity}/${data.total_quantity})`)
    }
  }

  console.log('\n🎉 種子資料執行完成')
}

main().catch(e => {
  console.error('❌', e)
  process.exit(1)
})
