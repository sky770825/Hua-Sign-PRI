// 檢查 Supabase 資料庫表是否已建立
// 使用 Node.js 和 Supabase 客戶端

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw';

const supabase = createClient(supabaseUrl, supabaseKey);

// 需要檢查的表
const REQUIRED_TABLES = [
  'estate_attendance_members',
  'estate_attendance_meetings',
  'estate_attendance_checkins',
  'estate_attendance_prizes',
  'estate_attendance_lottery_winners'
];

async function checkTables() {
  console.log('════════════════════════════════════════════════');
  console.log('  🔍 檢查 Supabase 資料庫表');
  console.log('════════════════════════════════════════════════');
  console.log('');

  const results = [];
  let allExist = true;

  for (const tableName of REQUIRED_TABLES) {
    try {
      // 嘗試查詢表（只查詢結構，不獲取數據）
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ ${tableName} - 未建立`);
          results.push({ table: tableName, exists: false, error: error.message });
          allExist = false;
        } else {
          console.log(`⚠️  ${tableName} - 查詢錯誤: ${error.message}`);
          results.push({ table: tableName, exists: true, error: error.message, count: count || 0 });
        }
      } else {
        console.log(`✅ ${tableName} - 已建立 (記錄數: ${count || 0})`);
        results.push({ table: tableName, exists: true, count: count || 0 });
      }
    } catch (err) {
      console.log(`❌ ${tableName} - 檢查失敗: ${err.message}`);
      results.push({ table: tableName, exists: false, error: err.message });
      allExist = false;
    }
  }

  console.log('');
  console.log('════════════════════════════════════════════════');
  
  if (allExist) {
    console.log('✅ 所有資料表都已建立！');
    console.log('');
    console.log('📊 數據統計：');
    results.forEach(r => {
      if (r.exists) {
        console.log(`  - ${r.table}: ${r.count || 0} 筆記錄`);
      }
    });
  } else {
    console.log('⚠️  部分資料表未建立');
    console.log('');
    console.log('📋 請執行以下 SQL 腳本：');
    console.log('  在 Supabase SQL Editor 中執行: create_estate_attendance_tables_organized.sql');
    console.log('');
    console.log('🔗 Supabase SQL Editor：');
    console.log('  https://supabase.com/dashboard/project/kwxlxjfcdghpguypadvi/sql/new');
  }

  console.log('════════════════════════════════════════════════');
  
  return { allExist, results };
}

// 執行檢查
checkTables()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('檢查失敗:', error);
    process.exit(1);
  });
