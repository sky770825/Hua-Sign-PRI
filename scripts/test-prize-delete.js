// 測試刪除獎品功能
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPrizeDelete() {
  console.log('════════════════════════════════════════════════');
  console.log('  🧪 測試刪除獎品功能');
  console.log('════════════════════════════════════════════════');
  console.log('');

  // 先查詢現有獎品
  console.log('📋 查詢現有獎品...');
  const { data: prizes, error: listError } = await supabase
    .from('estate_attendance_prizes')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);

  if (listError) {
    console.log('❌ 查詢失敗:', listError.message);
    return;
  }

  if (!prizes || prizes.length === 0) {
    console.log('⚠️  沒有獎品可以測試刪除');
    return;
  }

  console.log(`✅ 找到 ${prizes.length} 個獎品`);
  prizes.forEach(p => {
    console.log(`  - ID: ${p.id}, 名稱: ${p.name}`);
  });
  console.log('');

  // 選擇第一個獎品進行測試
  const testPrize = prizes[0];
  console.log(`🧪 測試刪除獎品 ID: ${testPrize.id} (${testPrize.name})`);
  console.log('');

  // 檢查是否有中獎記錄
  console.log('📋 檢查中獎記錄...');
  const { data: winners, error: winnersError } = await supabase
    .from('estate_attendance_lottery_winners')
    .select('id')
    .eq('prize_id', testPrize.id)
    .limit(1);

  if (winnersError) {
    console.log('⚠️  查詢中獎記錄失敗:', winnersError.message);
  } else if (winners && winners.length > 0) {
    console.log(`⚠️  此獎品有 ${winners.length} 筆中獎記錄，刪除前會先刪除中獎記錄`);
  } else {
    console.log('✅ 此獎品沒有中獎記錄');
  }
  console.log('');

  // 詢問是否繼續
  console.log('💡 這只是測試腳本，不會實際刪除');
  console.log('   如果要實際測試，請在網頁中操作');
  console.log('');

  // 測試刪除（但不實際執行）
  console.log('📋 刪除流程檢查：');
  console.log('  1. ✅ 查詢獎品 - 成功');
  console.log('  2. ✅ 檢查中獎記錄 - 完成');
  console.log('  3. ⏸️  刪除圖片（如果有）');
  console.log('  4. ⏸️  刪除獎品記錄');
  console.log('');

  console.log('════════════════════════════════════════════════');
  console.log('  📋 診斷建議');
  console.log('════════════════════════════════════════════════');
  console.log('');
  console.log('如果無法刪除獎品，請檢查：');
  console.log('  1. 瀏覽器控制台的錯誤訊息');
  console.log('  2. 網路請求的響應（Network 標籤）');
  console.log('  3. 伺服器日誌（終端）');
  console.log('');
  console.log('常見問題：');
  console.log('  - 權限錯誤：確認 RLS 已禁用');
  console.log('  - 外鍵約束：有中獎記錄需要先刪除');
  console.log('  - API 錯誤：檢查伺服器日誌');
  console.log('');
}

testPrizeDelete()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('測試過程發生錯誤:', error);
    process.exit(1);
  });
