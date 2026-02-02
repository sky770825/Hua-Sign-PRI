/**
 * 匯入單一會議出席表 CSV（共用邏輯，供 CLI 與原腳本使用）
 */
import { readFileSync } from 'fs'
import { getSupabase } from '../lib/supabase.mjs'

function parseCSVLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || c === '\t') {
      cells.push(current.trim())
      current = ''
    } else current += c
  }
  cells.push(current.trim())
  return cells
}

/**
 * @param {string} csvPath - CSV 檔案路徑
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function runImport(csvPath) {
  const { supabase, TABLES } = getSupabase()

  let csvContent
  try {
    csvContent = readFileSync(csvPath, 'utf-8')
  } catch (e) {
    throw new Error(`無法讀取檔案: ${csvPath}`)
  }

  const lines = csvContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('CSV 至少需要標題行和一行資料')

  const header = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(line => {
    const cells = parseCSVLine(line)
    const row = {}
    header.forEach((h, i) => { row[h] = cells[i] || '' })
    return row
  }).filter(r => r['會員編號'])

  const meetingDate = rows[0]?.['會議日期'] || ''
  if (!meetingDate) throw new Error('CSV 無會議日期')

  await supabase.from(TABLES.MEETINGS).upsert(
    { date: meetingDate, status: 'scheduled' },
    { onConflict: 'date' }
  )

  const statusMap = { '早安': 'present', '遲到': 'late', '代理': 'proxy', '代理出席': 'proxy' }
  const toImport = []
  const membersToUpsert = new Map()

  for (const row of rows) {
    const memberId = parseInt(row['會員編號'])
    if (isNaN(memberId) || memberId <= 0) continue
    const statusRaw = (row['出席狀態'] || '').trim()
    if (!statusRaw || statusRaw === 'None') continue

    const status = statusMap[statusRaw] || 'present'
    const checkinTime = (row['簽到時間'] || '').trim()
    const checkinTimestamp = checkinTime
      ? `${meetingDate}T${checkinTime}+08:00`
      : `${meetingDate}T19:00:00+08:00`

    toImport.push({
      member_id: memberId,
      meeting_date: meetingDate,
      checkin_time: checkinTimestamp,
      message: (row['留言'] || '').trim() || null,
      status
    })
    membersToUpsert.set(memberId, {
      id: memberId,
      name: (row['姓名'] || '').trim() || `會員${memberId}`,
      profession: (row['專業別'] || '').trim() || null
    })
  }

  await supabase.from(TABLES.MEMBERS).upsert(
    [...membersToUpsert.values()],
    { onConflict: 'id' }
  )

  let created = 0
  let skipped = 0
  for (const rec of toImport) {
    const { data: existing } = await supabase
      .from(TABLES.CHECKINS)
      .select('id')
      .eq('member_id', rec.member_id)
      .eq('meeting_date', rec.meeting_date)
      .maybeSingle()
    if (existing) {
      skipped++
      continue
    }
    const { error } = await supabase.from(TABLES.CHECKINS).insert(rec)
    if (error) skipped++
    else created++
  }

  return { meetingDate, rows: rows.length, toImport: toImport.length, created, skipped }
}

export const help = 'import csv <file>           匯入單一會議出席表 CSV'

/**
 * CLI：匯入單一 CSV 並列印結果
 * @param {string} [file] - CSV 路徑（由 CLI 或腳本傳入）
 */
export async function run(file) {
  const csvPath = file
  if (!csvPath) {
    console.log('用法: cli import csv <file.csv>')
    return
  }
  const result = await runImport(csvPath)
  console.log(`📂 讀取 ${result.rows} 筆資料`)
  console.log(`✅ 會議 ${result.meetingDate} 已就緒`)
  console.log(`📤 將匯入 ${result.toImport} 筆簽到記錄`)
  console.log(`✅ 會員資料已更新`)
  console.log(`\n✅ 匯入完成！新增簽到：${result.created} 筆，已存在/跳過：${result.skipped} 筆`)
}
