-- ============================================
-- 📤 資料庫數據導出腳本
-- ============================================
-- 用途：導出所有資料表的數據為 INSERT 語句
-- 執行方式：在 Supabase SQL Editor 中執行，複製結果
-- 日期：2026-01-20
-- ============================================

-- ============================================
-- 📋 導出會員數據
-- ============================================

SELECT 
  'INSERT INTO estate_attendance_members (id, name, profession, created_at, updated_at) VALUES (' ||
  id || ', ''' || 
  REPLACE(COALESCE(name, ''), '''', '''''') || ''', ' ||
  CASE 
    WHEN profession IS NULL THEN 'NULL'
    ELSE '''' || REPLACE(profession, '''', '''''') || ''''
  END || ', ''' ||
  created_at || ''', ''' ||
  updated_at || ''');' AS insert_statement
FROM estate_attendance_members
ORDER BY id;

-- ============================================
-- 📋 導出會議數據
-- ============================================

SELECT 
  'INSERT INTO estate_attendance_meetings (date, status, created_at, updated_at) VALUES (''' ||
  date || ''', ''' ||
  status || ''', ''' ||
  created_at || ''', ''' ||
  updated_at || ''');' AS insert_statement
FROM estate_attendance_meetings
ORDER BY date;

-- ============================================
-- 📋 導出簽到記錄數據
-- ============================================

SELECT 
  'INSERT INTO estate_attendance_checkins (member_id, meeting_date, checkin_time, message, status, created_at, updated_at) VALUES (' ||
  member_id || ', ''' ||
  meeting_date || ''', ''' ||
  checkin_time || ''', ' ||
  CASE 
    WHEN message IS NULL THEN 'NULL'
    ELSE '''' || REPLACE(message, '''', '''''') || ''''
  END || ', ''' ||
  status || ''', ''' ||
  created_at || ''', ''' ||
  updated_at || ''');' AS insert_statement
FROM estate_attendance_checkins
ORDER BY meeting_date, member_id;

-- ============================================
-- 📋 導出獎品數據
-- ============================================

SELECT 
  'INSERT INTO estate_attendance_prizes (name, image_url, total_quantity, remaining_quantity, probability, created_at, updated_at) VALUES (''' ||
  REPLACE(COALESCE(name, ''), '''', '''''') || ''', ' ||
  CASE 
    WHEN image_url IS NULL THEN 'NULL'
    ELSE '''' || image_url || ''''
  END || ', ' ||
  total_quantity || ', ' ||
  remaining_quantity || ', ' ||
  probability || ', ''' ||
  created_at || ''', ''' ||
  updated_at || ''');' AS insert_statement
FROM estate_attendance_prizes
ORDER BY id;

-- ============================================
-- 📋 導出中獎記錄數據
-- ============================================

SELECT 
  'INSERT INTO estate_attendance_lottery_winners (meeting_date, member_id, prize_id, claimed_status, created_at) VALUES (''' ||
  meeting_date || ''', ' ||
  member_id || ', ' ||
  prize_id || ', ''' ||
  claimed_status || ''', ''' ||
  created_at || ''');' AS insert_statement
FROM estate_attendance_lottery_winners
ORDER BY meeting_date, created_at;

-- ============================================
-- 📊 數據統計
-- ============================================

SELECT 
  'estate_attendance_members' AS table_name,
  COUNT(*) AS record_count
FROM estate_attendance_members
UNION ALL
SELECT 
  'estate_attendance_meetings' AS table_name,
  COUNT(*) AS record_count
FROM estate_attendance_meetings
UNION ALL
SELECT 
  'estate_attendance_checkins' AS table_name,
  COUNT(*) AS record_count
FROM estate_attendance_checkins
UNION ALL
SELECT 
  'estate_attendance_prizes' AS table_name,
  COUNT(*) AS record_count
FROM estate_attendance_prizes
UNION ALL
SELECT 
  'estate_attendance_lottery_winners' AS table_name,
  COUNT(*) AS record_count
FROM estate_attendance_lottery_winners
ORDER BY table_name;

-- ============================================
-- ✅ 導出完成
-- ============================================
SELECT '✅ 數據導出完成！' AS message,
       '請複製上方的 INSERT 語句並保存到文件' AS instruction;
