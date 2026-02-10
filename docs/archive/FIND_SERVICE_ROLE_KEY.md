# 🔍 如何找到 service_role key

## 📋 詳細步驟

### 方法 1: 通過 Supabase Dashboard（推薦）

1. **登入 Supabase Dashboard**
   - 前往：https://supabase.com/dashboard
   - 使用您的帳號登入

2. **選擇專案**
   - 在專案列表中，找到並點擊：**"專案檔案集中使用"** 或 **"sqgrnowrcvspxhuudrqc"**

3. **進入 API 設置**
   - 在左側選單中，點擊 **"Settings"**（設置）
   - 然後點擊 **"API"**

4. **找到 service_role key**
   - 在 "Project API keys" 區塊中，您會看到兩個 key：
     - **`anon` `public`** - 這是公開的匿名 key（前端使用）
     - **`service_role` `secret`** - 這是服務端 key（後端使用）⚠️

5. **複製 service_role key**
   - 找到 `service_role` key（通常會標註為 "secret"）
   - 點擊 key 旁邊的 **"Reveal"** 或 **"Copy"** 按鈕
   - 複製完整的 JWT token（很長，200+ 字符）

### 方法 2: 直接連結

**直接前往 API 設置頁面**：
```
https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
```

## 🔑 service_role key 的特徵

- **格式**: JWT token（以 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 開頭）
- **長度**: 通常 200+ 字符
- **標註**: 會標註為 "secret" 或 "service_role"
- **位置**: 在 "Project API keys" 區塊中，在 `anon` key 下方

## ⚠️ 如果找不到

### 檢查項目：

1. **確認專案**
   - 確認您選擇的是正確的專案：`sqgrnowrcvspxhuudrqc`

2. **確認權限**
   - 確認您的帳號有權限查看 API keys
   - 如果是團隊專案，可能需要管理員權限

3. **檢查頁面位置**
   - 必須在 "Settings" → "API" 頁面
   - 不是 "Database" 或其他頁面

### 替代方案：

如果無法找到 service_role key，可以：

1. **使用 anon key + 禁用 RLS**（臨時方案）
   - 在 Supabase SQL Editor 中執行：
     ```sql
     ALTER TABLE estate_attendance_prizes DISABLE ROW LEVEL SECURITY;
     ```
   - 然後在 `.env.local` 中暫時使用 `anon` key：
     ```bash
     SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxZ3Jub3dyY3ZzcHhodXVkcnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMTExNjYsImV4cCI6MjA4Mzc4NzE2Nn0.VMg-7oQTmPapHLGeLzEZ3l_5zcyCZRjJdw_X2J-8kRw
     ```
   - ⚠️ 這不是最佳實踐，但可以暫時解決問題

2. **聯繫 Supabase 支援**
   - 如果確實找不到 service_role key，可能需要聯繫 Supabase 支援

## 📸 視覺指引

在 Supabase Dashboard 的 API 設置頁面，您應該看到類似這樣的結構：

```
Project API keys
├── anon public
│   └── eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (這是您已經有的)
│
└── service_role secret ⚠️
    └── eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (這是您需要的)
```

## 🔗 快速連結

- **API 設置頁面**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api
- **專案 Dashboard**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc
- **SQL Editor**: https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new
