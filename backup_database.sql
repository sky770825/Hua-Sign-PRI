-- ============================================
-- 📦 Supabase 資料庫完整備份腳本
-- ============================================
-- 用途：備份所有資料表結構和數據
-- 執行方式：在 Supabase SQL Editor 中執行
-- 日期：2026-01-20
-- ============================================

-- ============================================
-- 📋 第一部分：資料庫結構備份
-- ============================================

-- 1. 會員表結構
CREATE TABLE IF NOT EXISTS estate_attendance_members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    profession TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 會議表結構
CREATE TABLE IF NOT EXISTS estate_attendance_meetings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 簽到記錄表結構
CREATE TABLE IF NOT EXISTS estate_attendance_checkins (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL,
    meeting_date DATE NOT NULL,
    checkin_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (member_id) REFERENCES estate_attendance_members(id) ON DELETE CASCADE,
    UNIQUE(member_id, meeting_date)
);

-- 4. 獎品表結構
CREATE TABLE IF NOT EXISTS estate_attendance_prizes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    remaining_quantity INTEGER NOT NULL DEFAULT 0,
    probability DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 中獎記錄表結構
CREATE TABLE IF NOT EXISTS estate_attendance_lottery_winners (
    id SERIAL PRIMARY KEY,
    meeting_date DATE NOT NULL,
    member_id INTEGER NOT NULL,
    prize_id INTEGER NOT NULL,
    claimed_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (member_id) REFERENCES estate_attendance_members(id) ON DELETE CASCADE,
    FOREIGN KEY (prize_id) REFERENCES estate_attendance_prizes(id) ON DELETE CASCADE
);

-- ============================================
-- 🔍 索引備份
-- ============================================

CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON estate_attendance_checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_meeting_date ON estate_attendance_checkins(meeting_date);
CREATE INDEX IF NOT EXISTS idx_checkins_member_date ON estate_attendance_checkins(member_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON estate_attendance_checkins(status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON estate_attendance_meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON estate_attendance_meetings(status);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_meeting_date ON estate_attendance_lottery_winners(meeting_date);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_member_id ON estate_attendance_lottery_winners(member_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_prize_id ON estate_attendance_lottery_winners(prize_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_status ON estate_attendance_lottery_winners(claimed_status);
CREATE INDEX IF NOT EXISTS idx_prizes_remaining ON estate_attendance_prizes(remaining_quantity);

-- ============================================
-- ⚙️ 觸發器函數備份
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_estate_attendance_members_updated_at ON estate_attendance_members;
CREATE TRIGGER update_estate_attendance_members_updated_at
    BEFORE UPDATE ON estate_attendance_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estate_attendance_meetings_updated_at ON estate_attendance_meetings;
CREATE TRIGGER update_estate_attendance_meetings_updated_at
    BEFORE UPDATE ON estate_attendance_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estate_attendance_checkins_updated_at ON estate_attendance_checkins;
CREATE TRIGGER update_estate_attendance_checkins_updated_at
    BEFORE UPDATE ON estate_attendance_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_estate_attendance_prizes_updated_at ON estate_attendance_prizes;
CREATE TRIGGER update_estate_attendance_prizes_updated_at
    BEFORE UPDATE ON estate_attendance_prizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 📊 第二部分：數據導出（可選）
-- ============================================
-- 注意：以下 SQL 會導出所有數據為 INSERT 語句
-- 如果需要備份數據，請執行以下查詢並保存結果

-- 導出會員數據
-- SELECT 'INSERT INTO estate_attendance_members (id, name, profession, created_at, updated_at) VALUES (' ||
--        id || ', ''' || REPLACE(name, '''', '''''') || ''', ' ||
--        COALESCE('''' || REPLACE(profession, '''', '''''') || '''', 'NULL') || ', ''' ||
--        created_at || ''', ''' || updated_at || ''');'
-- FROM estate_attendance_members
-- ORDER BY id;

-- 導出會議數據
-- SELECT 'INSERT INTO estate_attendance_meetings (date, status, created_at, updated_at) VALUES (''' ||
--        date || ''', ''' || status || ''', ''' ||
--        created_at || ''', ''' || updated_at || ''');'
-- FROM estate_attendance_meetings
-- ORDER BY date;

-- 導出簽到記錄數據
-- SELECT 'INSERT INTO estate_attendance_checkins (member_id, meeting_date, checkin_time, message, status, created_at, updated_at) VALUES (' ||
--        member_id || ', ''' || meeting_date || ''', ''' ||
--        checkin_time || ''', ' ||
--        COALESCE('''' || REPLACE(message, '''', '''''') || '''', 'NULL') || ', ''' ||
--        status || ''', ''' || created_at || ''', ''' || updated_at || ''');'
-- FROM estate_attendance_checkins
-- ORDER BY meeting_date, member_id;

-- 導出獎品數據
-- SELECT 'INSERT INTO estate_attendance_prizes (name, image_url, total_quantity, remaining_quantity, probability, created_at, updated_at) VALUES (''' ||
--        REPLACE(name, '''', '''''') || ''', ' ||
--        COALESCE('''' || image_url || '''', 'NULL') || ', ' ||
--        total_quantity || ', ' || remaining_quantity || ', ' ||
--        probability || ', ''' || created_at || ''', ''' || updated_at || ''');'
-- FROM estate_attendance_prizes
-- ORDER BY id;

-- 導出中獎記錄數據
-- SELECT 'INSERT INTO estate_attendance_lottery_winners (meeting_date, member_id, prize_id, claimed_status, created_at) VALUES (''' ||
--        meeting_date || ''', ' || member_id || ', ' ||
--        prize_id || ', ''' || claimed_status || ''', ''' ||
--        created_at || ''');'
-- FROM estate_attendance_lottery_winners
-- ORDER BY meeting_date, created_at;

-- ============================================
-- ✅ 備份完成
-- ============================================
SELECT '✅ 資料庫結構備份完成！' AS message,
       '包含：' AS description,
       '1. 5 個主要資料表' AS table1,
       '2. 所有索引' AS table2,
       '3. 所有觸發器' AS table3,
       '4. 觸發器函數' AS table4;
