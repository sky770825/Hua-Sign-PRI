// 測試所有按鈕功能的腳本
// 檢查前端按鈕的串接和功能

const fs = require('fs');
const path = require('path');

console.log('════════════════════════════════════════════════');
console.log('  🔍 檢查所有按鈕功能');
console.log('════════════════════════════════════════════════');
console.log('');

const pages = [
  { file: 'app/admin/attendance_management/page.tsx', name: '管理後台 - 出席管理' },
  { file: 'app/checkin/page.tsx', name: '簽到頁面' },
  { file: 'app/lottery/page.tsx', name: '抽獎頁面' },
];

pages.forEach(({ file, name }) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 檢查按鈕
    const buttonMatches = content.match(/<button[^>]*>/g) || [];
    const onClickMatches = content.match(/onClick\s*=\s*\{[^}]*\}/g) || [];
    const onSubmitMatches = content.match(/onSubmit\s*=\s*\{[^}]*\}/g) || [];
    
    console.log(`📄 ${name}:`);
    console.log(`  按鈕數量: ${buttonMatches.length}`);
    console.log(`  onClick 處理器: ${onClickMatches.length}`);
    console.log(`  onSubmit 處理器: ${onSubmitMatches.length}`);
    console.log('');
  } else {
    console.log(`❌ ${name}: 文件不存在`);
    console.log('');
  }
});

console.log('✅ 檢查完成');
