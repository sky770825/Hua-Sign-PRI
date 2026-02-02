#!/usr/bin/env node
/**
 * 為無圖片的獎品新增基本照片 URL
 * 使用 picsum.photos 固定種子，每個獎品有不同但穩定的圖片
 * 使用：node scripts/add-prize-placeholder-images.mjs
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

// picsum.photos 固定種子，每個獎品 ID 對應穩定圖片
function getPlaceholderUrl(prizeId) {
  return `https://picsum.photos/seed/estate-prize-${prizeId}/200/200`
}

async function main() {
  console.log('🖼️ 檢查無圖片的獎品並新增基本照片...\n')

  const { data: prizes, error } = await supabase
    .from(TABLES.PRIZES)
    .select('id, name, image_url')
    .order('id', { ascending: true })

  if (error) {
    console.error('❌ 讀取獎品失敗:', error.message)
    process.exit(1)
  }

  const needsUpdate = (prizes || []).filter(p => !p.image_url || String(p.image_url).trim() === '')
  if (needsUpdate.length === 0) {
    console.log('✅ 所有獎品已有圖片')
    return
  }

  console.log(`發現 ${needsUpdate.length} 個獎品無圖片，正在更新...\n`)

  for (const p of needsUpdate) {
    const url = getPlaceholderUrl(p.id)
    const { error: updErr } = await supabase
      .from(TABLES.PRIZES)
      .update({ image_url: url })
      .eq('id', p.id)

    if (updErr) {
      console.error(`❌ 更新失敗 [${p.name}]:`, updErr.message)
    } else {
      console.log(`✅ ${p.name} (id: ${p.id}) -> ${url}`)
    }
  }

  console.log('\n🎉 完成')
}

main().catch(e => {
  console.error('❌', e)
  process.exit(1)
})
