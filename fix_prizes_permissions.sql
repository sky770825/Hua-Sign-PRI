-- ============================================
-- 🔧 修復 estate_attendance_prizes 表權限
-- ============================================
-- 錯誤：permission denied for table estate_attendance_prizes
-- 錯誤碼：42501
-- 解決方案：設置 RLS 政策或禁用 RLS
-- ============================================

-- ============================================
-- 方案 1: 禁用 RLS（最簡單，適合開發環境）
-- ============================================

-- 禁用 Row Level Security
ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 方案 2: 設置允許所有操作的 RLS 政策（推薦用於生產環境）
-- ============================================
-- ⚠️ 注意：如果選擇此方案，請先註釋掉方案1，不要同時執行

-- 先刪除所有現有政策（必須先執行，避免 "already exists" 錯誤）
DROP POLICY IF EXISTS "Enable insert for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable select for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Allow all operations on prizes" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable read access for all users" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON estate_attendance_prizes;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON estate_attendance_prizes;

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE estate_attendance_prizes ENABLE ROW LEVEL SECURITY;

-- 創建允許所有操作的政策（使用 service_role key 時）
-- 注意：這允許所有用戶讀寫，如果只需要特定用戶，請修改條件

-- 允許所有人讀取
CREATE POLICY "Enable read access for all users"
ON estate_attendance_prizes
FOR SELECT
TO public
USING (true);

-- 允許所有人插入（使用 service_role key 時）
CREATE POLICY "Enable insert for all users"
ON estate_attendance_prizes
FOR INSERT
TO public
WITH CHECK (true);

-- 允許所有人更新
CREATE POLICY "Enable update for all users"
ON estate_attendance_prizes
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 允許所有人刪除
CREATE POLICY "Enable delete for all users"
ON estate_attendance_prizes
FOR DELETE
TO public
USING (true);

-- ============================================
-- 方案 3: 檢查並修復其他表的權限（可選）
-- ============================================

-- 檢查所有 estate_attendance 表的 RLS 狀態
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN 'RLS 已啟用'
    ELSE 'RLS 已禁用'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'estate_attendance_%'
ORDER BY tablename;

-- ============================================
-- 驗證修復
-- ============================================

-- 檢查 RLS 是否已禁用
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'estate_attendance_prizes';

-- 檢查政策
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

-- ============================================
-- ✅ 完成
-- ============================================

SELECT '✅ 權限修復完成！' AS message,
       '如果使用方案 1，RLS 已禁用' AS note1,
       '如果使用方案 2，已創建允許所有操作的政策' AS note2,
       '請重新嘗試新增獎品' AS action;
