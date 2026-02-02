/**
 * 批次匯入多個會議出席表 CSV
 */
import { runImport } from './import-csv.mjs'

export const help = 'import batch <file...>      批次匯入多個 CSV'

/**
 * @param {string[]} files - CSV 檔案路徑
 */
export async function run(files) {
  if (!files.length) {
    console.log('用法: cli import batch <file1.csv> [file2.csv ...]')
    return
  }
  console.log(`📋 共 ${files.length} 個 CSV 待匯入\n`)
  for (let i = 0; i < files.length; i++) {
    const path = files[i]
    console.log(`\n[${i + 1}/${files.length}] ${path.split('/').pop()}`)
    try {
      const result = await runImport(path)
      console.log(`📂 讀取 ${result.rows} 筆資料`)
      console.log(`✅ 會議 ${result.meetingDate} 已就緒`)
      console.log(`📤 將匯入 ${result.toImport} 筆簽到`)
      console.log(`✅ 匯入完成！新增 ${result.created} 筆，跳過 ${result.skipped} 筆`)
    } catch (e) {
      console.error('❌', e.message)
    }
  }
  console.log('\n✅ 批次匯入結束')
}
