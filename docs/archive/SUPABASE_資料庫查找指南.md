# Supabase 資料庫查找指南

## 您的專案資訊

| 項目 | 值 |
|------|-----|
| **專案 Ref** | `sqgrnowrcvspxhuudrqc` |
| **Project URL** | `https://sqgrnowrcvspxhuudrqc.supabase.co` |

---

## 如何找到資料庫

### 方法一：直接連結（最快）

點以下連結（需先登入 Supabase）：

- **專案首頁**：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc  
- **API 金鑰**：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api  
- **SQL Editor**：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/sql/new  
- **Table Editor**：https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/editor  

### 方法二：從 Dashboard 進入

1. 開啟 https://supabase.com/dashboard  
2. 登入帳號  
3. 在專案列表中找：
   - 名稱為 **「專案檔案集中使用」** 或類似名稱  
   - 或專案 Ref 為 **sqgrnowrcvspxhuudrqc**  
4. 點選該專案進入  

---

## 若在列表中看不到專案

可能原因與處理方式：

| 狀況 | 處理方式 |
|------|----------|
| **專案被暫停** | 免費方案閒置約 7 天會暫停，進入專案後點 **Restore project** |
| **用錯帳號登入** | 確認是否使用建立專案時的那個 Supabase 帳號 |
| **專案在 Team 底下** | 左側切換到正確的 Team/Organization |
| **專案被刪除** | 需重新建立專案並還原資料（如有備份） |

---

## 資料表名稱

本專案使用的資料表（前綴 `estate_attendance_`）：

- `estate_attendance_members` 會員
- `estate_attendance_meetings` 會議
- `estate_attendance_checkins` 簽到
- `estate_attendance_prizes` 獎品
- `estate_attendance_lottery_winners` 中獎記錄

在 **Table Editor** 或 **SQL Editor** 中可查看與查詢這些表格。
