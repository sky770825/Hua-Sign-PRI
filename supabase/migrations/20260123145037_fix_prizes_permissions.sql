-- ============================================
-- 🔧 修復：刪除現有政策並禁用 RLS
-- ============================================
-- 先刪除所有現有政策，然後禁用 RLS
-- ============================================

-- 刪除所有現有政策（如果存在）
DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;

-- 禁用 Row Level Security
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;

-- 驗證結果
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';

-- 應該看到 rls_enabled = false
