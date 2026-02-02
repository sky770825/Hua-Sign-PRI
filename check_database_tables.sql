-- ============================================
-- 🔍 檢查 Supabase 資料庫表是否已建立
-- ============================================
-- 用途：快速檢查所有資料表是否存在
-- 執行方式：在 Supabase SQL Editor 中執行
-- 日期：2026-01-20
-- ============================================

-- ============================================
-- 📋 檢查所有必需的資料表
-- ============================================

SELECT 
  '📊 資料表檢查結果' AS title,
  '' AS separator;

-- 1. 檢查會員表
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estate_attendance_members'
    ) THEN '✅ estate_attendance_members 已建立'
    ELSE '❌ estate_attendance_members 未建立'
  END AS status,
  (SELECT COUNT(*) FROM estate_attendance_members) AS record_count
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_members'
)
UNION ALL
SELECT 
  '❌ estate_attendance_members 未建立' AS status,
  0 AS record_count
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_members'
);

-- 2. 檢查會議表
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estate_attendance_meetings'
    ) THEN '✅ estate_attendance_meetings 已建立'
    ELSE '❌ estate_attendance_meetings 未建立'
  END AS status,
  (SELECT COUNT(*) FROM estate_attendance_meetings) AS record_count
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_meetings'
)
UNION ALL
SELECT 
  '❌ estate_attendance_meetings 未建立' AS status,
  0 AS record_count
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_meetings'
);

-- 3. 檢查簽到記錄表
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estate_attendance_checkins'
    ) THEN '✅ estate_attendance_checkins 已建立'
    ELSE '❌ estate_attendance_checkins 未建立'
  END AS status,
  (SELECT COUNT(*) FROM estate_attendance_checkins) AS record_count
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_checkins'
)
UNION ALL
SELECT 
  '❌ estate_attendance_checkins 未建立' AS status,
  0 AS record_count
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_checkins'
);

-- 4. 檢查獎品表
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estate_attendance_prizes'
    ) THEN '✅ estate_attendance_prizes 已建立'
    ELSE '❌ estate_attendance_prizes 未建立'
  END AS status,
  (SELECT COUNT(*) FROM estate_attendance_prizes) AS record_count
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_prizes'
)
UNION ALL
SELECT 
  '❌ estate_attendance_prizes 未建立' AS status,
  0 AS record_count
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_prizes'
);

-- 5. 檢查中獎記錄表
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estate_attendance_lottery_winners'
    ) THEN '✅ estate_attendance_lottery_winners 已建立'
    ELSE '❌ estate_attendance_lottery_winners 未建立'
  END AS status,
  (SELECT COUNT(*) FROM estate_attendance_lottery_winners) AS record_count
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_lottery_winners'
)
UNION ALL
SELECT 
  '❌ estate_attendance_lottery_winners 未建立' AS status,
  0 AS record_count
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'estate_attendance_lottery_winners'
);

-- ============================================
-- 📊 總結報告
-- ============================================

SELECT 
  '════════════════════════════════════════════════' AS separator,
  '📋 檢查總結' AS summary,
  '' AS empty1,
  '' AS empty2;

SELECT 
  COUNT(*) AS total_tables,
  SUM(CASE WHEN table_name LIKE 'estate_attendance_%' THEN 1 ELSE 0 END) AS estate_attendance_tables,
  CASE 
    WHEN SUM(CASE WHEN table_name LIKE 'estate_attendance_%' THEN 1 ELSE 0 END) = 5 
    THEN '✅ 所有表已建立'
    ELSE '⚠️  部分表未建立'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'estate_attendance_%';

-- ============================================
-- 📋 列出所有 estate_attendance 相關的表
-- ============================================

SELECT 
  '📋 已建立的表：' AS info,
  table_name,
  '✅' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'estate_attendance_%'
ORDER BY table_name;

-- ============================================
-- ⚠️ 如果表未建立，請執行以下 SQL
-- ============================================

SELECT 
  '⚠️  如果看到 ❌，請執行：' AS instruction,
  'create_estate_attendance_tables_organized.sql' AS sql_file,
  '在 Supabase SQL Editor 中執行該文件' AS action;
