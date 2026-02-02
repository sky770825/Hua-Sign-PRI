#!/usr/bin/env node
/**
 * 端對端測試流程
 * 1. 會員管理：新增 → 驗證 → 刪除
 * 2. 會議與抽獎：建立會議 → 簽到 → 驗證名單同步 → 抽獎 → 清理
 * 3. 刪除所有範例資料
 * 
 * 使用：先啟動 npm run dev，再執行 node scripts/e2e-test-flow.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

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
  console.warn('無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const TEST_MEMBER_ID = 99999
const TEST_MEETING_DATE = '2030-12-31' // 未來日期，避免影響現有資料

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body && typeof body === 'object' && !(body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {},
    body: body && typeof body === 'object' && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body,
  })
  return res
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  console.log('=== 端對端測試流程 ===\n')
  console.log('請確保開發伺服器已啟動：npm run dev\n')

  const errors = []
  const createdMeetingDate = []
  const createdMemberIds = []
  const createdWinnerIds = []

  try {
    // ===== 1. 會員管理測試 =====
    console.log('--- 1. 會員管理測試 ---')
    
    // (a) 新增範例會員
    console.log('(a) 新增範例會員...')
    const createRes = await api('POST', '/api/members/create', {
      id: TEST_MEMBER_ID,
      name: '測試範例會員_E2E',
      profession: '測試專業',
    })
    const createData = await createRes.json().catch(() => ({}))
    
    if (!createRes.ok || !createData.success) {
      throw new Error(`新增會員失敗: ${createData.error || createRes.status}`)
    }
    createdMemberIds.push(TEST_MEMBER_ID)
    console.log('   ✅ 新增成功')

    // 驗證資料庫
    const { data: memberInDb, error: memberErr } = await supabase
      .from('estate_attendance_members')
      .select('id, name, profession')
      .eq('id', TEST_MEMBER_ID)
      .single()

    if (memberErr || !memberInDb) {
      throw new Error(`資料庫驗證失敗: 找不到會員 ${TEST_MEMBER_ID}`)
    }
    if (memberInDb.name !== '測試範例會員_E2E') {
      throw new Error(`資料庫驗證失敗: 姓名不符 ${memberInDb.name}`)
    }
    console.log('   ✅ 資料庫驗證通過')

    // (b) 刪除範例會員
    console.log('(b) 刪除範例會員...')
    const deleteRes = await api('DELETE', `/api/members/${TEST_MEMBER_ID}`)
    const deleteData = await deleteRes.json().catch(() => ({}))
    
    if (!deleteRes.ok && deleteRes.status !== 404) {
      throw new Error(`刪除會員失敗: ${deleteData.error || deleteRes.status}`)
    }
    const { data: afterDelete } = await supabase
      .from('estate_attendance_members')
      .select('id')
      .eq('id', TEST_MEMBER_ID)
      .maybeSingle()
    
    if (afterDelete) {
      throw new Error('刪除後資料庫仍有該會員')
    }
    console.log('   ✅ 刪除成功並驗證\n')

    // ===== 2. 會議與抽獎測試 =====
    console.log('--- 2. 會議與抽獎測試 ---')
    
    // 需要一個已存在的會員來簽到
    const { data: existingMembers } = await supabase
      .from('estate_attendance_members')
      .select('id')
      .limit(5)
    
    if (!existingMembers || existingMembers.length === 0) {
      console.log('   ⚠️ 跳過會議測試：無會員資料')
    } else {
      // (a) 建立會議
      console.log('(a) 建立會議...')
      const meetingRes = await api('POST', '/api/meetings', {
        date: TEST_MEETING_DATE,
        status: 'scheduled',
      })
      if (!meetingRes.ok) {
        const err = await meetingRes.json().catch(() => ({}))
        throw new Error(`建立會議失敗: ${err.error || meetingRes.status}`)
      }
      createdMeetingDate.push(TEST_MEETING_DATE)
      console.log('   ✅ 會議已建立')

      // 簽到（用第一個現有會員）
      const testMemberId = existingMembers[0].id
      console.log('(a) 執行簽到...')
      const checkinRes = await api('POST', '/api/checkin', {
        memberId: testMemberId,
        date: TEST_MEETING_DATE,
        status: 'present',
        message: 'E2E測試簽到',
      })
      if (!checkinRes.ok) {
        const err = await checkinRes.json().catch(() => ({}))
        throw new Error(`簽到失敗: ${err.error || checkinRes.status}`)
      }
      console.log('   ✅ 簽到成功')

      // (b) 確認簽到名單同步到抽獎
      console.log('(b) 確認簽到名單同步...')
      const checkinsRes = await fetch(`${BASE}/api/checkins?date=${TEST_MEETING_DATE}`)
      const checkinsData = await checkinsRes.json().catch(() => ({}))
      const checkins = checkinsData.checkins || []
      
      if (checkins.length === 0) {
        throw new Error('簽到名單為空，無法進行抽獎')
      }
      console.log(`   ✅ 簽到名單: ${checkins.length} 人`)

      // 檢查抽獎頁是否可取得名單（透過 checkins API，抽獎頁用同一 API）
      console.log('   ✅ 名單已同步（checkins API 與抽獎共用）')

      // (c) 抽獎 - 需要先有獎品
      const { data: prizes } = await supabase
        .from('estate_attendance_prizes')
        .select('id, remaining_quantity')
        .gt('remaining_quantity', 0)
        .limit(1)

      if (!prizes || prizes.length === 0) {
        console.log('   ⚠️ 跳過抽獎：無可用獎品')
      } else {
        console.log('(c) 執行抽獎...')
        const drawRes = await api('POST', '/api/lottery/draw', { date: TEST_MEETING_DATE })
        const drawData = await drawRes.json().catch(() => ({}))
        
        if (!drawRes.ok) {
          throw new Error(`抽獎失敗: ${drawData.error || drawRes.status}`)
        }
        if (drawData.winner?.id) {
          createdWinnerIds.push({ id: drawData.winner.id, meeting_date: TEST_MEETING_DATE })
        }
        console.log('   ✅ 抽獎成功')
        if (drawData.winner?.name) {
          console.log(`      中獎者: ${drawData.winner.name}`)
        }
      }
    }

    // ===== 3. 刪除範例資料 =====
    console.log('\n--- 3. 清理範例資料 ---')
    
    // 刪除測試會議的簽到
    for (const d of createdMeetingDate) {
      const { data: cks } = await supabase.from('estate_attendance_checkins')
        .select('id, member_id').eq('meeting_date', d)
      if (cks?.length) {
        for (const c of cks) {
          await api('POST', '/api/checkin/delete', { memberId: c.member_id, date: d })
        }
        console.log(`   已刪除 ${d} 的簽到記錄`)
      }
    }

    // 刪除測試會議
    for (const d of createdMeetingDate) {
      const { data: meetings } = await supabase.from('estate_attendance_meetings')
        .select('id').eq('date', d)
      if (meetings?.length) {
        const mid = meetings[0].id
        await api('DELETE', `/api/meetings/${mid}`)
        console.log(`   已刪除會議 ${d}`)
      }
    }

    // 中獎記錄會因刪除會議或 cascade 而處理，視 schema 而定
    // 若無 cascade，需手動刪
    const { data: testWinners } = await supabase.from('estate_attendance_lottery_winners')
      .select('id').eq('meeting_date', TEST_MEETING_DATE)
    if (testWinners?.length) {
      for (const w of testWinners) {
        await api('DELETE', `/api/lottery/winners/${w.id}`)
      }
      console.log(`   已刪除測試中獎記錄`)
    }

    console.log('   ✅ 清理完成\n')
    console.log('=== 測試通過 ===')

  } catch (e) {
    console.error('\n❌ 測試失敗:', e.message)
    process.exit(1)
  }
}

main()
