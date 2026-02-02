// 測試獎品插入功能
// 驗證權限修復是否成功

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPrizeInsert() {
  console.log('════════════════════════════════════════════════');
  console.log('  🧪 測試獎品插入功能');
  console.log('════════════════════════════════════════════════');
  console.log('');

  try {
    // 測試插入一個測試獎品
    const testPrize = {
      name: '測試獎品（請刪除）',
      total_quantity: 1,
      remaining_quantity: 1,
      probability: 1.0,
      completion_message: '測試訊息'
    };

    console.log('正在測試插入獎品...');
    const { data, error } = await supabase
      .from('estate_attendance_prizes')
      .insert([testPrize])
      .select();

    if (error) {
      console.log('❌ 插入失敗:');
      console.log('  錯誤碼:', error.code);
      console.log('  錯誤訊息:', error.message);
      console.log('');
      console.log('⚠️  權限問題可能尚未修復');
      console.log('請確認已執行: ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;');
      return false;
    }

    if (data && data.length > 0) {
      console.log('✅ 插入成功！');
      console.log('  獎品 ID:', data[0].id);
      console.log('  獎品名稱:', data[0].name);
      console.log('');

      // 刪除測試獎品
      console.log('正在刪除測試獎品...');
      const { error: deleteError } = await supabase
        .from('estate_attendance_prizes')
        .delete()
        .eq('id', data[0].id);

      if (deleteError) {
        console.log('⚠️  測試獎品已創建但無法自動刪除，請手動刪除 ID:', data[0].id);
      } else {
        console.log('✅ 測試獎品已自動刪除');
      }

      console.log('');
      console.log('✅ 權限修復成功！新增獎品功能現在可以正常使用了！');
      return true;
    } else {
      console.log('❌ 插入成功但沒有返回數據');
      return false;
    }
  } catch (err) {
    console.log('❌ 測試失敗:', err.message);
    return false;
  }
}

testPrizeInsert()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('測試過程發生錯誤:', error);
    process.exit(1);
  });
