-- ============================================
-- 🔧 修復 estate_attendance_prizes 表權限（清理版）
-- ============================================
-- 錯誤：permission denied for table estate_attendance_prizes
-- 錯誤碼：42501
-- ============================================
-- 此文件包含兩個獨立的方案，請選擇其中一個執行
-- ============================================

-- ============================================
-- 方案 1: 禁用 RLS（最簡單，推薦用於開發環境）
-- ============================================
-- 如果選擇此方案，只執行以下代碼：

-- 先刪除所有可能存在的政策（避免衝突）
DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Allow all operations on prizes" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable read access for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON estate_attendance_prizes;

-- 禁用 Row Level Security
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;

-- 驗證結果
SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ RLS 仍啟用'
    ELSE '✅ RLS 已禁用'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';

-- ============================================
-- 方案 2: 設置允許所有操作的 RLS 政策（推薦用於生產環境）
-- ============================================
-- 如果選擇此方案，只執行以下代碼（不要同時執行方案1）：

/*
-- 先刪除所有現有政策（如果存在）
DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Allow all operations on prizes" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable read access for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON estate_attendance_prizes;

-- 啟用 RLS
ALTER TABLE estate_attendance_prizes ENABLE ROW LEVEL SECURITY;

-- 創建允許所有操作的政策
CREATE POLICY "Enable select for all users" ON estate_attendance_prizes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users" ON estate_attendance_prizes
  FOR INSERT
  TO public
  WITH CHECK (true);

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
  policyname,
  cmd AS operation,
  roles,
  CASE 
    WHEN qual IS NULL AND with_check IS NULL THEN '✅ 允許所有操作'
    ELSE '⚠️  有條件限制'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes'
ORDER BY policyname;
*/

-- ============================================
-- ✅ 完成
-- ============================================
-- 執行方案1後，應該看到 rls_enabled = false
-- 然後可以重新嘗試新增獎品功能
