/**
 * 遷移腳本：從 SQLite 遷移到 Insforge
 * 執行方式：npx tsx scripts/migrate-to-insforge.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { insforge, TABLES } from '../lib/insforge';

const dbPath = path.join(process.cwd(), 'data', 'checkin.db');

async function migrateData() {
  console.log('🚀 開始遷移資料到 Insforge...\n');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ SQLite 資料庫檔案不存在:', dbPath);
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // 1. 遷移會員資料
    console.log('📦 遷移會員資料...');
    const members = db.prepare('SELECT id, name, profession, created_at FROM members').all() as Array<{
      id: number;
      name: string;
      profession: string | null;
      created_at: string | null;
    }>;

    if (members.length > 0) {
      // 檢查是否已有資料
      const { data: existingMembers } = await insforge.database
        .from(TABLES.MEMBERS)
        .select('id')
        .limit(1);

      if (!existingMembers || existingMembers.length === 0) {
        const membersData = members.map(m => ({
          id: m.id,
          name: m.name,
          profession: m.profession || null,
          created_at: m.created_at || new Date().toISOString(),
        }));

        const { error } = await insforge.database
          .from(TABLES.MEMBERS)
          .insert(membersData);

        if (error) {
          console.error('❌ 會員資料遷移失敗:', error);
        } else {
          console.log(`✅ 已遷移 ${members.length} 筆會員資料`);
        }
      } else {
        console.log('ℹ️  會員資料已存在，跳過遷移');
      }
    }

    // 2. 遷移會議資料
    console.log('\n📅 遷移會議資料...');
    const meetings = db.prepare('SELECT id, date, status, created_at FROM meetings').all() as Array<{
      id: number;
      date: string;
      status: string;
      created_at: string | null;
    }>;

    if (meetings.length > 0) {
      const { data: existingMeetings } = await insforge.database
        .from(TABLES.MEETINGS)
        .select('id')
        .limit(1);

      if (!existingMeetings || existingMeetings.length === 0) {
        const meetingsData = meetings.map(m => ({
          id: m.id, // 保留原始 ID
          date: m.date,
          status: m.status,
          created_at: m.created_at || new Date().toISOString(),
        }));

        const { error } = await insforge.database
          .from(TABLES.MEETINGS)
          .insert(meetingsData);

        if (error) {
          console.error('❌ 會議資料遷移失敗:', error);
        } else {
          console.log(`✅ 已遷移 ${meetings.length} 筆會議資料`);
        }
      } else {
        console.log('ℹ️  會議資料已存在，跳過遷移');
      }
    }

    // 3. 遷移簽到記錄
    console.log('\n✅ 遷移簽到記錄...');
    const checkins = db.prepare('SELECT id, member_id, meeting_date, checkin_time, message, status FROM checkins').all() as Array<{
      id: number;
      member_id: number;
      meeting_date: string;
      checkin_time: string;
      message: string | null;
      status: string;
    }>;

    if (checkins.length > 0) {
      const { data: existingCheckins } = await insforge.database
        .from(TABLES.CHECKINS)
        .select('id')
        .limit(1);

      if (!existingCheckins || existingCheckins.length === 0) {
        // 分批插入（每次 100 筆）
        const batchSize = 100;
        for (let i = 0; i < checkins.length; i += batchSize) {
          const batch = checkins.slice(i, i + batchSize).map(c => ({
            id: c.id, // 保留原始 ID
            member_id: c.member_id,
            meeting_date: c.meeting_date,
            checkin_time: c.checkin_time,
            message: c.message || null,
            status: c.status,
          }));

          const { error } = await insforge.database
            .from(TABLES.CHECKINS)
            .insert(batch);

          if (error) {
            console.error(`❌ 簽到記錄批次 ${i / batchSize + 1} 遷移失敗:`, error);
          } else {
            console.log(`✅ 已遷移簽到記錄 ${Math.min(i + batchSize, checkins.length)}/${checkins.length}`);
          }
        }
      } else {
        console.log('ℹ️  簽到記錄已存在，跳過遷移');
      }
    }

    // 4. 遷移獎品資料
    console.log('\n🎁 遷移獎品資料...');
    const prizes = db.prepare('SELECT id, name, image_url, total_quantity, remaining_quantity, probability, created_at, updated_at FROM prizes').all() as Array<{
      id: number;
      name: string;
      image_url: string | null;
      total_quantity: number;
      remaining_quantity: number;
      probability: number;
      created_at: string | null;
      updated_at: string | null;
    }>;

    if (prizes.length > 0) {
      const { data: existingPrizes } = await insforge.database
        .from(TABLES.PRIZES)
        .select('id')
        .limit(1);

      if (!existingPrizes || existingPrizes.length === 0) {
        const prizesData = prizes.map(p => ({
          id: p.id, // 保留原始 ID
          name: p.name,
          image_url: p.image_url || null,
          image_key: null, // 稍後需要重新上傳圖片
          total_quantity: p.total_quantity,
          remaining_quantity: p.remaining_quantity,
          probability: p.probability,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
        }));

        const { error } = await insforge.database
          .from(TABLES.PRIZES)
          .insert(prizesData);

        if (error) {
          console.error('❌ 獎品資料遷移失敗:', error);
        } else {
          console.log(`✅ 已遷移 ${prizes.length} 筆獎品資料`);
        }
      } else {
        console.log('ℹ️  獎品資料已存在，跳過遷移');
      }
    }

    // 5. 遷移抽獎中獎記錄
    console.log('\n🎰 遷移抽獎中獎記錄...');
    const winners = db.prepare('SELECT id, meeting_date, member_id, prize_id, created_at FROM lottery_winners').all() as Array<{
      id: number;
      meeting_date: string;
      member_id: number;
      prize_id: number;
      created_at: string | null;
    }>;

    if (winners.length > 0) {
      const { data: existingWinners } = await insforge.database
        .from(TABLES.LOTTERY_WINNERS)
        .select('id')
        .limit(1);

      if (!existingWinners || existingWinners.length === 0) {
        const winnersData = winners.map(w => ({
          id: w.id, // 保留原始 ID
          meeting_date: w.meeting_date,
          member_id: w.member_id,
          prize_id: w.prize_id,
          created_at: w.created_at || new Date().toISOString(),
        }));

        const { error } = await insforge.database
          .from(TABLES.LOTTERY_WINNERS)
          .insert(winnersData);

        if (error) {
          console.error('❌ 中獎記錄遷移失敗:', error);
        } else {
          console.log(`✅ 已遷移 ${winners.length} 筆中獎記錄`);
        }
      } else {
        console.log('ℹ️  中獎記錄已存在，跳過遷移');
      }
    }

    console.log('\n✨ 遷移完成！');
  } catch (error) {
    console.error('❌ 遷移過程中發生錯誤:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// 執行遷移
migrateData().catch(console.error);

