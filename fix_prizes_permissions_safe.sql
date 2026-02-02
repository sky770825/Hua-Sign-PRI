-- ============================================
-- 🔧 安全修復 estate_attendance_prizes 表權限
-- ============================================
-- 此腳本會先刪除現有政策，然後重新創建
-- 或直接禁用 RLS（最簡單的方式）
-- ============================================

-- ============================================
-- 方案 1: 禁用 RLS（最簡單，推薦）
--===========================================

-- 禁用 Row Level Security
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;

-- 驗證 RLS 狀態
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';

-- ============================================
-- 方案 2: 刪除現有政策並重新創建（如果需要保留 RLS）
-- ============================================

-- 先刪除所有現有政策（如果存在）
DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE estate_attendance_prizes ENABLE ROW LEVEL SECURITY;

-- 創建允許所有操作的 RLS 政策
CREATE POLICY "Enable insert for all users" ON estate_attendance_prizes
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON estate_attendance_prizes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable update for all users" ON estate_attendance_prizes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON estate_attendance_prizes
  FOR DELETE
  TO public
  USING (true);

-- 驗證政策
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';
