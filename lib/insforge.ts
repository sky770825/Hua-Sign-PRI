import { createClient } from '@insforge/sdk';

// Insforge 後端配置
const baseUrl = 'https://dsfp4gvz.us-east.insforge.app';
const anonKey = process.env.INFORGE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzA0NzV9.kN3HK0LTmFgdIZflzVv-oHIdEOfK0R6wPG7yWluqjsQ';

// 創建 Insforge 客戶端
export const insforge = createClient({
  baseUrl,
  anonKey,
});

// 表名常量（使用 checkin_ 前綴）
export const TABLES = {
  MEMBERS: 'checkin_members',
  MEETINGS: 'checkin_meetings',
  CHECKINS: 'checkin_checkins',
  PRIZES: 'checkin_prizes',
  LOTTERY_WINNERS: 'checkin_lottery_winners',
} as const;

// 儲存桶名稱
export const BUCKETS = {
  PRIZES: 'checkin-prizes',
} as const;

