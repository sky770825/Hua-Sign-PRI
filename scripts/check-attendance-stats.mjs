#!/usr/bin/env node
/**
 * 診斷出席統計：檢查會議數、簽到數、比對是否合理
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
} catch (e) {
  console.warn('無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ 請設定 SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('📊 出席統計診斷\n')

  // 1. 會議總數與日期範圍
  const { data: meetings, error: mErr } = await supabase
    .from('estate_attendance_meetings')
    .select('date')
    .order('date', { ascending: true })

  if (mErr) {
    console.error('❌ 讀取會議失敗:', mErr.message)
    process.exit(1)
  }

  const meetingDates = (meetings || []).map(m => m.date)
  const totalMeetings = meetingDates.length

  console.log('1️⃣ 會議表 (estate_attendance_meetings)')
  console.log(`   總數：${totalMeetings} 場`)
  if (meetingDates.length > 0) {
    console.log(`   最早：${meetingDates[0]}`)
    console.log(`   最晚：${meetingDates[meetingDates.length - 1]}`)
  }

  // 2. 有簽到記錄的會議（實際舉辦的會議）
  const { data: checkins } = await supabase
    .from('estate_attendance_checkins')
    .select('meeting_date')

  const meetingsWithCheckins = new Set((checkins || []).map(c => c.meeting_date))
  console.log(`\n2️⃣ 有簽到記錄的會議`)
  console.log(`   實際有簽到的會議數：${meetingsWithCheckins.size} 場`)

  const meetingsWithoutCheckins = meetingDates.filter(d => !meetingsWithCheckins.has(d))
  if (meetingsWithoutCheckins.length > 0) {
    console.log(`   ⚠️ 無簽到記錄的會議（${meetingsWithoutCheckins.length} 場）：`)
    console.log(`      ${meetingsWithoutCheckins.slice(0, 10).join(', ')}${meetingsWithoutCheckins.length > 10 ? '...' : ''}`)
  }

  // 3. 簽到記錄總數與狀態分布
  const { data: allCheckins } = await supabase
    .from('estate_attendance_checkins')
    .select('member_id, meeting_date, status')

  const statusCounts = {}
  ;(allCheckins || []).forEach(c => {
    const s = c.status || 'null'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  })

  console.log(`\n3️⃣ 簽到記錄 (estate_attendance_checkins)`)
  console.log(`   總數：${(allCheckins || []).length} 筆`)
  console.log(`   狀態分布：`, statusCounts)

  // 4. 會員數
  const { data: members } = await supabase
    .from('estate_attendance_members')
    .select('id')

  console.log(`\n4️⃣ 會員數：${(members || []).length} 人`)

  // 5. 影響分析
  if (totalMeetings > meetingsWithCheckins.size) {
    console.log('\n📌 說明：')
    console.log(`   會議表共 ${totalMeetings} 場，其中 ${meetingsWithCheckins.size} 場有簽到記錄。`)
    console.log('   統計報表以「簽到記錄」為準，總會議數 = 有簽到的日期數（不依會議表筆數）。')
  }

  // 6. 簽到日期 vs 會議表（統計報表現以簽到為準，全部計入）
  const checkinDatesSet = new Set((allCheckins || []).map(c => c.meeting_date))
  const orphanDates = [...checkinDatesSet].filter(d => !meetingDates.includes(d))
  if (orphanDates.length > 0) {
    console.log('\n📌 簽到有、會議表無的日期（統計報表仍會計入）：')
    console.log(`   ${orphanDates.sort().join(', ')}`)
  }

  // 7. 統計報表口徑（以簽到記錄為準：有簽到的會議日期數）
  const statsMeetingCount = meetingsWithCheckins.size
  console.log(`\n📈 統計報表使用的總會議數：${statsMeetingCount} 場`)
  console.log('   （= 有至少一筆簽到的會議日期，依簽到記錄統整，不依會議表筆數）')
  if (orphanDates.length > 0) {
    console.log(`   ✅ 上述 ${orphanDates.length} 個「孤兒」簽到日期已計入統計，不再遺漏。`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
