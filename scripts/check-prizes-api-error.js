// 檢查獎品 API 錯誤詳情
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sqgrnowrcvspxhuudrqc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('════════════════════════════════════════════════');
console.log('  🔍 檢查獎品 API 錯誤');
console.log('════════════════════════════════════════════════');
console.log('');

console.log('📋 環境變數檢查：');
console.log('  SUPABASE_URL:', supabaseUrl);
console.log('  SUPABASE_SERVICE_KEY 設置:', supabaseServiceKey ? '✅ 已設置' : '❌ 未設置');
if (supabaseServiceKey) {
  console.log('  SUPABASE_SERVICE_KEY 長度:', supabaseServiceKey.length);
  console.log('  SUPABASE_SERVICE_KEY 開頭:', supabaseServiceKey.substring(0, 20) + '...');
  
  if (supabaseServiceKey.startsWith('sbp_')) {
    console.log('  ⚠️  警告: SUPABASE_SERVICE_KEY 是 CLI token，不是 service_role key！');
    console.log('  應該是 JWT token 格式（以 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... 開頭）');
  } else if (supabaseServiceKey.startsWith('eyJ')) {
    console.log('  ✅ SUPABASE_SERVICE_KEY 格式正確（JWT token）');
  } else {
    console.log('  ⚠️  SUPABASE_SERVICE_KEY 格式不確定');
  }
}

console.log('');

// 測試連接
if (supabaseServiceKey) {
  console.log('📋 測試 Supabase 連接...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  supabase
    .from('estate_attendance_prizes')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ 查詢失敗:');
        console.log('  錯誤碼:', error.code);
        console.log('  錯誤訊息:', error.message);
        console.log('  錯誤詳情:', error);
        
        if (error.code === '42501') {
          console.log('');
          console.log('💡 這是權限錯誤，可能的原因：');
          console.log('  1. RLS 仍然啟用');
          console.log('  2. SUPABASE_SERVICE_KEY 不正確（不是 service_role key）');
        } else if (error.message?.includes('Invalid API key')) {
          console.log('');
          console.log('💡 API key 無效，請確認：');
          console.log('  1. SUPABASE_SERVICE_KEY 是正確的 service_role key');
          console.log('  2. 不是 anon key 或 CLI token');
        }
      } else {
        console.log('✅ 查詢成功！');
        console.log('  返回記錄數:', data?.length || 0);
      }
    })
    .catch((err) => {
      console.log('❌ 連接錯誤:', err.message);
    });
} else {
  console.log('❌ 無法測試：SUPABASE_SERVICE_KEY 未設置');
}
