-- ============================================
-- 🔧 簡單修復：禁用 RLS
-- ============================================
-- 這是最簡單的解決方案，直接禁用 RLS
-- ============================================

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
