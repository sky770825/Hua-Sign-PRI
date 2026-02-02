const fs = require('fs');
const path = require('path');

// 讀取 CSV 檔案
const csvPath = '/Users/caijunchang/Downloads/出席統計_2025-07-18_2026-01-14 (1).csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// 解析 CSV（處理 BOM）
const lines = csvContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());

if (lines.length < 2) {
  console.error('CSV 檔案格式錯誤：至少需要標題行和一行數據');
  process.exit(1);
}

// 解析標題行
const parseCSVLine = (line) => {
  const cells = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  cells.push(currentCell.trim());
  return cells;
};

const header = parseCSVLine(lines[0]);
const dataRows = lines.slice(1).map((line, index) => {
  const cells = parseCSVLine(line);
  return {
    rowIndex: index + 2,
    cells
  };
}).filter(row => row.cells.length >= 2 && row.cells[0] && row.cells[1]);

// 解析統計數據
const statistics = [];

for (const row of dataRows) {
  try {
    const memberId = parseInt(row.cells[0]);
    const memberName = row.cells[1] || '';
    const totalMeetings = parseInt(row.cells[2] || '0');
    const presentCount = parseInt(row.cells[3] || '0');
    const lateCount = parseInt(row.cells[4] || '0');
    const proxyCount = parseInt(row.cells[5] || '0');
    const absentCount = parseInt(row.cells[6] || '0');

    if (isNaN(memberId) || memberId <= 0) continue;

    statistics.push({
      memberId,
      memberName,
      totalMeetings,
      presentCount,
      lateCount,
      proxyCount,
      absentCount
    });
  } catch (error) {
    console.warn(`跳過第 ${row.rowIndex} 行：`, error.message);
  }
}

console.log(`解析完成：${statistics.length} 筆會員數據`);

// 從檔案名稱提取日期範圍
const fileName = path.basename(csvPath);
const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
const startDate = dateMatch ? dateMatch[1] : '2025-07-18';
const endDate = dateMatch ? dateMatch[2] : '2026-01-14';

console.log(`日期範圍：${startDate} ~ ${endDate}`);

// 調用匯入 API
const fetch = require('node-fetch');

async function importData() {
  try {
    console.log('\n開始匯入...');
    
    const response = await fetch('http://localhost:3000/api/statistics/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statistics,
        startDate,
        endDate
      })
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('API 返回非 JSON 響應:', text.substring(0, 500));
      process.exit(1);
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMsg = result.error || result.message || '未知錯誤';
      console.error('匯入失敗：', errorMsg);
      if (result.details) {
        console.error('詳細資訊：', JSON.stringify(result.details, null, 2));
      }
      process.exit(1);
    }

    const data = result.data || result;
    const results = data?.results || {};

    console.log('\n✅ 匯入完成！');
    console.log(`📊 統計：`);
    console.log(`  • 處理會員數：${results.totalMembers || 0}`);
    console.log(`  • 會議數：${results.totalMeetings || 0}`);
    console.log(`  • 創建簽到記錄：${results.checkinsCreated || 0} 筆`);
    console.log(`  • 跳過記錄：${results.checkinsSkipped || 0} 筆`);
    console.log(`  • 錯誤數：${results.errors || 0}`);
    
    if (results.errorDetails && results.errorDetails.length > 0) {
      console.log(`\n⚠️ 錯誤詳情（前 10 個）：`);
      results.errorDetails.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    if (results.checkinsCreated === 0) {
      console.log('\n⚠️ 注意：沒有創建任何簽到記錄！');
      console.log('可能原因：');
      console.log('1. 會員不存在（請先匯入會員資料）');
      console.log('2. 所有日期都已有簽到記錄');
      console.log('3. CSV 中的會員 ID 與資料庫不符');
    }

  } catch (error) {
    console.error('匯入失敗：', error.message);
    process.exit(1);
  }
}

importData();
