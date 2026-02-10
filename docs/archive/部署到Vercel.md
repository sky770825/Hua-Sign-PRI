# 部署到 Vercel（華地產簽到系統）

> 倉庫：https://github.com/sky770825/Hua-Sign-PRI

---

## 一、從 GitHub 匯入到 Vercel

1. 開啟 **https://vercel.com** 並登入
2. 點 **Add New** → **Project**
3. 選 **Import Git Repository**
4. 搜尋或選 **`sky770825/Hua-Sign-PRI`**
5. 點 **Import**

---

## 二、設定環境變數（必填）

在 **Configure Project** 頁面，展開 **Environment Variables**，新增：

| 名稱 | 值 | 說明 |
|------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://sqgrnowrcvspxhuudrqc.supabase.co` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 從 Supabase 複製 anon key | [取得](https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api) |
| `SUPABASE_SERVICE_KEY` | 從 Supabase 複製 **service_role** JWT | 必須是 `eyJ` 開頭，不是 `sbp_` |
| `ADMIN_PASSWORD` | 自訂（例：h123） | 後台登入密碼 |

**Environment**：勾選 **Production**。

取得 Supabase 金鑰：  
https://supabase.com/dashboard/project/sqgrnowrcvspxhuudrqc/settings/api

---

## 三、部署

點 **Deploy**，約 1–2 分鐘後完成。

---

## 四、網址

- 網站：`https://你的專案名稱.vercel.app`
- 簽到：`https://你的專案名稱.vercel.app/checkin`
- 抽獎：`https://你的專案名稱.vercel.app/lottery`
- 後台：`https://你的專案名稱.vercel.app/admin/login`

---

## 五、若已有專案

若專案已在 Vercel 且已連結 GitHub：

- 推送程式碼到 GitHub 後會自動重新部署
- 環境變數在 **Settings** → **Environment Variables** 管理
