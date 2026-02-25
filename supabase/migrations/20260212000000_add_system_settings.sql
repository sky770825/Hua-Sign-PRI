-- 系統設定表：會議室開放／簽到截止等與後台「系統設定」同步
-- 若已執行過完整 create 腳本（含 table6）可略過此 migration
CREATE TABLE IF NOT EXISTS estate_attendance_system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE estate_attendance_system_settings IS '系統設定 - 會議室開放/簽到截止等，與後台設定同步';
