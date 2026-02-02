/**
 * 刪除指定日期之前的會議及相關簽到、抽獎記錄
 */
import { getSupabase } from '../lib/supabase.mjs'

export const help = 'db delete-meetings-before <date>  刪除該日期之前的會議與簽到、抽獎'

/**
 * @param {string} cutoffDate - YYYY-MM-DD
 */
export async function run(cutoffDate) {
  const date = cutoffDate || '2025-08-14'
  const { supabase, TABLES } = getSupabase()

  console.log(`🗑️  刪除 ${date} 之前的會議及相關資料...\n`)

  const { data: checkinsDeleted, error: errCheckins } = await supabase
    .from(TABLES.CHECKINS)
    .delete()
    .lt('meeting_date', date)
    .select('id')
  if (errCheckins) throw new Error('刪除簽到記錄失敗: ' + errCheckins.message)
  console.log(`✅ 簽到記錄：已刪除 ${checkinsDeleted?.length ?? 0} 筆`)

  const { data: winnersDeleted, error: errWinners } = await supabase
    .from(TABLES.WINNERS)
    .delete()
    .lt('meeting_date', date)
    .select('id')
  if (errWinners) throw new Error('刪除抽獎記錄失敗: ' + errWinners.message)
  console.log(`✅ 抽獎記錄：已刪除 ${winnersDeleted?.length ?? 0} 筆`)

  const { data: meetingsDeleted, error: errMeetings } = await supabase
    .from(TABLES.MEETINGS)
    .delete()
    .lt('date', date)
    .select('id, date')
  if (errMeetings) throw new Error('刪除會議失敗: ' + errMeetings.message)
  const meetingsCount = meetingsDeleted?.length ?? 0
  console.log(`✅ 會議：已刪除 ${meetingsCount} 筆`)
  if (meetingsDeleted?.length) {
    console.log(`   刪除的會議日期：${meetingsDeleted.map(m => m.date).sort().join(', ')}`)
  }
  console.log('\n✅ 刪除完成！')
}
