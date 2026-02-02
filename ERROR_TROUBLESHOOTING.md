# 🔧 伺服器錯誤排查指南

## 常見錯誤解決方案

### 1. 端口被占用

**問題**：端口 3000 已被其他進程占用

**解決方法**：
```bash
# 查找占用端口的進程
lsof -ti:3000

# 終止占用端口的進程
kill -9 $(lsof -ti:3000)

# 或使用不同的端口
npm run dev -- -p 3001
```

### 2. 多個 Next.js 進程衝突

**問題**：多個 `next dev` 進程同時運行

**解決方法**：
```bash
# 查找所有 Next.js 進程
ps aux | grep "next dev"

# 終止所有 Next.js 進程
pkill -f "next dev"

# 等待幾秒後重新啟動
sleep 2
npm run dev
```

### 3. 構建緩存問題

**問題**：.next 緩存損壞導致錯誤

**解決方法**：
```bash
# 清除構建緩存
rm -rf .next

# 清除 node_modules（可選）
rm -rf node_modules
npm install

# 重新啟動
npm run dev
```

### 4. 記憶體不足

**問題**：Node.js 記憶體不足導致崩潰

**解決方法**：
```bash
# 增加 Node.js 記憶體限制
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### 5. 檔案監控問題（macOS）

**問題**：檔案監控達到上限

**解決方法**：
```bash
# 增加檔案監控限制（需要重啟終端）
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
```

### 6. 依賴衝突

**問題**：node_modules 依賴版本衝突

**解決方法**：
```bash
# 清除並重新安裝
rm -rf node_modules package-lock.json
npm install

# 如果還有問題，清除 npm 緩存
npm cache clean --force
npm install
```

## 🔄 完整的重啟流程

如果伺服器持續出現錯誤，請按照以下步驟操作：

```bash
# 1. 停止所有 Next.js 進程
pkill -f "next dev"

# 2. 等待進程完全終止
sleep 3

# 3. 清除構建緩存
rm -rf .next

# 4. 檢查端口是否被占用
lsof -ti:3000 && kill -9 $(lsof -ti:3000) || echo "端口 3000 可用"

# 5. 重新啟動伺服器
npm run dev
```

## 📊 檢查伺服器狀態

```bash
# 檢查進程是否運行
ps aux | grep "next dev" | grep -v grep

# 檢查端口是否監聽
lsof -i :3000

# 檢查伺服器是否響應
curl -s http://localhost:3000 | head -5
```

## 🚨 如果問題持續

1. **檢查錯誤日誌**：查看終端輸出的完整錯誤訊息
2. **檢查代碼**：確保最近沒有引入語法錯誤
3. **檢查環境變數**：確保 `.env.local` 配置正確
4. **檢查資料庫連接**：確保 Supabase 連接正常
5. **查看 Next.js 版本**：確保使用兼容的版本

## 💡 預防措施

1. **定期清理緩存**：每週執行一次 `rm -rf .next`
2. **使用進程管理**：考慮使用 `pm2` 或 `forever` 管理進程
3. **監控記憶體使用**：注意 Node.js 記憶體使用情況
4. **保持依賴更新**：定期更新 `package.json` 依賴

---

**最後更新**：2026-01-15
**版本**：v1.0
