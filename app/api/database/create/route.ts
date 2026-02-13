import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { apiError, apiSuccess, requireDangerousAdminOpsEnabled, requireSameOrigin } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// 完整的資料庫建立 SQL（分類有序）
const CREATE_TABLES_SQL = `-- ============================================
-- 📊 Estate Attendance 資料庫結構
-- ============================================
-- 建立時間：2026-01-14
-- 說明：所有表使用 estate_attendance_ 前綴，分類清晰有序
-- ============================================

-- ============================================
-- 📁 分類 1：會員管理 (Members Management)
-- ============================================

-- 1. 會員表 (estate_attendance_members)
-- 用途：儲存會員基本資料
CREATE TABLE IF NOT EXISTS estate_attendance_members (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    profession TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE estate_attendance_members IS '會員基本資料表 - 儲存所有會員的基本資訊';
COMMENT ON COLUMN estate_attendance_members.id IS '會員編號（主鍵，唯一識別碼）';
COMMENT ON COLUMN estate_attendance_members.name IS '會員姓名（必填）';
COMMENT ON COLUMN estate_attendance_members.profession IS '專業別（可選）';
COMMENT ON COLUMN estate_attendance_members.created_at IS '建立時間（自動記錄）';
COMMENT ON COLUMN estate_attendance_members.updated_at IS '更新時間（自動更新）';

-- ============================================
-- 📁 分類 2：會議管理 (Meetings Management)
-- ============================================

-- 2. 會議表 (estate_attendance_meetings)
-- 用途：儲存會議資訊（每週四的會議）
CREATE TABLE IF NOT EXISTS estate_attendance_meetings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE estate_attendance_meetings IS '會議資料表 - 儲存每週四的會議資訊';
COMMENT ON COLUMN estate_attendance_meetings.id IS '會議 ID（主鍵，自動遞增）';
COMMENT ON COLUMN estate_attendance_meetings.date IS '會議日期（唯一，格式：YYYY-MM-DD）';
COMMENT ON COLUMN estate_attendance_meetings.status IS '會議狀態：scheduled（已安排）/ completed（已完成）/ cancelled（已取消）';
COMMENT ON COLUMN estate_attendance_meetings.created_at IS '建立時間（自動記錄）';
COMMENT ON COLUMN estate_attendance_meetings.updated_at IS '更新時間（自動更新）';

-- ============================================
-- 📁 分類 3：簽到記錄 (Check-ins Management)
-- ============================================

-- 3. 簽到記錄表 (estate_attendance_checkins)
-- 用途：儲存會員的簽到記錄
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

COMMENT ON TABLE estate_attendance_checkins IS '簽到記錄表 - 儲存會員的簽到記錄';
COMMENT ON COLUMN estate_attendance_checkins.id IS '簽到記錄 ID（主鍵，自動遞增）';
COMMENT ON COLUMN estate_attendance_checkins.member_id IS '會員編號（外鍵，關聯到會員表）';
COMMENT ON COLUMN estate_attendance_checkins.meeting_date IS '會議日期（關聯到會議表）';
COMMENT ON COLUMN estate_attendance_checkins.checkin_time IS '簽到時間（精確到秒）';
COMMENT ON COLUMN estate_attendance_checkins.message IS '簽到留言（可選）';
COMMENT ON COLUMN estate_attendance_checkins.status IS '出席狀態：present（出席）/ early（早到）/ late（遲到）/ early_leave（早退）/ absent（缺席）';
COMMENT ON COLUMN estate_attendance_checkins.created_at IS '建立時間（自動記錄）';
COMMENT ON COLUMN estate_attendance_checkins.updated_at IS '更新時間（自動更新）';

-- ============================================
-- 📁 分類 4：獎品管理 (Prizes Management)
-- ============================================

-- 4. 獎品表 (estate_attendance_prizes)
-- 用途：儲存抽獎獎品資訊
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

COMMENT ON TABLE estate_attendance_prizes IS '獎品資料表 - 儲存抽獎獎品資訊';
COMMENT ON COLUMN estate_attendance_prizes.id IS '獎品 ID（主鍵，自動遞增）';
COMMENT ON COLUMN estate_attendance_prizes.name IS '獎品名稱（必填）';
COMMENT ON COLUMN estate_attendance_prizes.image_url IS '獎品圖片 URL（可選）';
COMMENT ON COLUMN estate_attendance_prizes.total_quantity IS '總數量（初始數量）';
COMMENT ON COLUMN estate_attendance_prizes.remaining_quantity IS '剩餘數量（可抽獎數量）';
COMMENT ON COLUMN estate_attendance_prizes.probability IS '中獎機率（0-100，小數點後兩位）';
COMMENT ON COLUMN estate_attendance_prizes.created_at IS '建立時間（自動記錄）';
COMMENT ON COLUMN estate_attendance_prizes.updated_at IS '更新時間（自動更新）';

-- ============================================
-- 📁 分類 5：抽獎記錄 (Lottery Records)
-- ============================================

-- 5. 中獎記錄表 (estate_attendance_lottery_winners)
-- 用途：儲存抽獎中獎記錄
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

COMMENT ON TABLE estate_attendance_lottery_winners IS '中獎記錄表 - 儲存抽獎中獎記錄';
COMMENT ON COLUMN estate_attendance_lottery_winners.id IS '中獎記錄 ID（主鍵，自動遞增）';
COMMENT ON COLUMN estate_attendance_lottery_winners.meeting_date IS '會議日期（中獎的會議日期）';
COMMENT ON COLUMN estate_attendance_lottery_winners.member_id IS '會員編號（外鍵，關聯到會員表）';
COMMENT ON COLUMN estate_attendance_lottery_winners.prize_id IS '獎品 ID（外鍵，關聯到獎品表）';
COMMENT ON COLUMN estate_attendance_lottery_winners.claimed_status IS '領取狀態：pending（待領取）/ claimed（已領取）';
COMMENT ON COLUMN estate_attendance_lottery_winners.created_at IS '建立時間（自動記錄）';

-- ============================================
-- 🔍 索引建立（提升查詢效能）
-- ============================================

-- 簽到記錄索引（最常查詢）
CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON estate_attendance_checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_meeting_date ON estate_attendance_checkins(meeting_date);
CREATE INDEX IF NOT EXISTS idx_checkins_member_date ON estate_attendance_checkins(member_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON estate_attendance_checkins(status);

-- 會議索引
CREATE INDEX IF NOT EXISTS idx_meetings_date ON estate_attendance_meetings(date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON estate_attendance_meetings(status);

-- 中獎記錄索引
CREATE INDEX IF NOT EXISTS idx_lottery_winners_meeting_date ON estate_attendance_lottery_winners(meeting_date);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_member_id ON estate_attendance_lottery_winners(member_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_prize_id ON estate_attendance_lottery_winners(prize_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_status ON estate_attendance_lottery_winners(claimed_status);

-- 獎品索引
CREATE INDEX IF NOT EXISTS idx_prizes_remaining ON estate_attendance_prizes(remaining_quantity);

-- ============================================
-- ⚙️ 觸發器函數（自動更新 updated_at）
-- ============================================

-- 建立觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表添加更新時間觸發器
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
-- ✅ 完成訊息
-- ============================================
SELECT '✅ 所有 estate_attendance 資料表已成功建立！' AS message,
       '資料庫結構已分類有序，包含：' AS description,
       '1. 會員管理 (estate_attendance_members)' AS table1,
       '2. 會議管理 (estate_attendance_meetings)' AS table2,
       '3. 簽到記錄 (estate_attendance_checkins)' AS table3,
       '4. 獎品管理 (estate_attendance_prizes)' AS table4,
       '5. 抽獎記錄 (estate_attendance_lottery_winners)' AS table5;
`

export async function POST(request: Request) {
  try {
    const originCheck = requireSameOrigin(request)
    if (originCheck) return originCheck
    const dangerousOpCheck = requireDangerousAdminOpsEnabled()
    if (dangerousOpCheck) return dangerousOpCheck

    console.log('開始檢查資料庫表...')

    // 檢查表是否存在
    const requiredTables = [
      'estate_attendance_members',
      'estate_attendance_meetings',
      'estate_attendance_checkins',
      'estate_attendance_prizes',
      'estate_attendance_lottery_winners'
    ]

    const results: Record<string, any> = {}

    for (const tableName of requiredTables) {
      try {
        // 嘗試查詢表
        const { error } = await supabaseService
          .from(tableName)
          .select('*')
          .limit(0)

        if (error) {
          if (error.message.includes('does not exist') || error.code === '42P01') {
            results[tableName] = { exists: false, action: '需要建立' }
          } else {
            results[tableName] = { exists: true, error: error.message }
          }
        } else {
          results[tableName] = { exists: true, action: '已存在' }
        }
      } catch (err) {
        results[tableName] = { 
          exists: false, 
          action: '需要建立',
          error: err instanceof Error ? err.message : '未知錯誤'
        }
      }
    }

    const missingTables = Object.entries(results)
      .filter(([_, status]) => !status.exists)
      .map(([name]) => name)

    return apiSuccess({
      message: missingTables.length === 0 
        ? '所有資料表已存在' 
        : `需要建立 ${missingTables.length} 個資料表`,
      tables: results,
      missingTables,
      sqlScript: CREATE_TABLES_SQL,
      instructions: missingTables.length > 0 ? [
        '1. 前往 Supabase Dashboard',
        '2. 打開 SQL Editor',
        '3. 複製下方的 SQL 腳本',
        '4. 貼上並執行',
        '5. 確認所有表都成功建立'
      ] : []
    })

  } catch (error) {
    console.error('檢查/建立資料庫表失敗:', error)
    return apiError(
      `操作失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      500
    )
  }
}
