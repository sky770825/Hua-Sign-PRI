# 快速找到 Functions 設置 - 3 種方法

## 方法 1: 直接連結（最快）

**直接點擊或複製這個連結到瀏覽器：**

```
https://dash.cloudflare.com/82ebeb1d91888e83e8e1b30eeb33d3c3/pages/view/hua-sign-pri/settings/functions
```

如果連結可以打開，您應該會看到：
- Compatibility Date（兼容性日期）
- Compatibility Flags（兼容性標誌）← **在這裡輸入 nodejs_compat**

## 方法 2: 逐步導航

### 第 1 步：登入
https://dash.cloudflare.com

### 第 2 步：點擊左側選單
找到並點擊：**「Workers & Pages」** 或 **「Pages」**

### 第 3 步：選擇專案
點擊：**「hua-sign-pri」**

### 第 4 步：點擊設置
在專案頁面中，點擊：**「Settings」** 或 **「設置」**

### 第 5 步：選擇 Functions
在 Settings 頁面中，點擊：**「Functions」** 或 **「函數」** 選項卡

### 第 6 步：找到輸入框
找到標籤為 **「Compatibility Flags」** 的輸入框

## 方法 3: 使用搜索功能

1. 登入 Cloudflare Dashboard
2. 前往專案頁面
3. 點擊 Settings
4. 按 `Ctrl+F`（Windows）或 `Cmd+F`（Mac）
5. 搜索：`compatibility` 或 `flags`
6. 找到匹配的輸入框

## 🆘 如果連結無法打開

### 可能原因 1: 需要登入
- 確保您已經登入 Cloudflare Dashboard
- 使用正確的帳號（sky19880825@gmail.com）

### 可能原因 2: 權限不足
- 確保您有該專案的管理權限

### 可能原因 3: 頁面結構不同
- Cloudflare Dashboard 可能更新了界面
- 請告訴我您在 Settings 頁面中看到了什麼

## 📸 您應該看到的內容

在 Functions 設置頁面中，您應該看到：

```
Functions Settings
├── Compatibility Date
│   └── [日期輸入框] 例如：2024-09-23
│
└── Compatibility Flags
    ├── Production（生產環境）
    │   └── [輸入框] ← 在這裡輸入 nodejs_compat
    │
    └── Preview（預覽環境）
        └── [輸入框] ← 在這裡輸入 nodejs_compat
```

## ✅ 操作步驟（找到輸入框後）

1. **在 Production 的輸入框中輸入：**
   ```
   nodejs_compat
   ```

2. **在 Preview 的輸入框中輸入：**
   ```
   nodejs_compat
   ```

3. **或如果只有一個輸入框：**
   - 輸入：`nodejs_compat`
   - 確保勾選了 Production 和 Preview

4. **點擊「Save」或「保存」按鈕**

## 🔍 如果還是找不到

請告訴我：
1. 您點擊 Settings 後看到了哪些選項卡？
2. 每個選項卡中有什麼內容？
3. 您是否看到了「Compatibility」相關的文字？

我可以根據您的描述提供更精確的指引！
