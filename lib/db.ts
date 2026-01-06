import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 支持環境變數配置資料庫路徑，生產環境可使用絕對路徑
const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'checkin.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 生產環境優化：啟用 WAL 模式提高並發性能
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});

// 啟用 WAL 模式（Write-Ahead Logging）提高並發讀寫性能
db.pragma('journal_mode = WAL');

// 初始化数据库表
export function initDatabase() {
  // 会员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      profession TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 会议表
  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 签到记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      meeting_date TEXT NOT NULL,
      checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      message TEXT,
      status TEXT DEFAULT 'present',
      FOREIGN KEY (member_id) REFERENCES members(id),
      UNIQUE(member_id, meeting_date)
    )
  `);

  // 奖品表
  db.exec(`
    CREATE TABLE IF NOT EXISTS prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image_url TEXT,
      total_quantity INTEGER DEFAULT 0,
      remaining_quantity INTEGER DEFAULT 0,
      probability REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 抽奖中奖记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS lottery_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_date TEXT NOT NULL,
      member_id INTEGER NOT NULL,
      prize_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (prize_id) REFERENCES prizes(id),
      UNIQUE(member_id, meeting_date)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lottery_winners_date
    ON lottery_winners (meeting_date)
  `);

  // 检查是否已有会员数据
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number };
  
  if (memberCount.count === 0) {
    // 插入会员数据
    const insertMember = db.prepare('INSERT INTO members (id, name, profession) VALUES (?, ?, ?)');
    const members = getMembersData();
    
    const insertMany = db.transaction((members) => {
      for (const member of members) {
        insertMember.run(member.id, member.name, member.profession);
      }
    });
    
    insertMany(members);
  }
}

function getMembersData() {
  return [
    { id: 1, name: '洪怡芳Ruby', profession: '包租代管平台' },
    { id: 2, name: '何青馨Eva', profession: '人壽房產金融' },
    { id: 3, name: '黃懷瑩Hannah', profession: '桃園市軟裝設計' },
    { id: 4, name: '黃齡毅Melody', profession: '雙北軟裝設計' },
    { id: 5, name: '鄭博元', profession: '一條龍搬家' },
    { id: 6, name: '戴龍睿Brett', profession: '包租代管-內湖區' },
    { id: 7, name: '林於樵Joe', profession: '臉書發文機器人' },
    { id: 8, name: '邱碩鈺Ellie', profession: '雙北住宅買房教學' },
    { id: 9, name: '陳書緯Peter', profession: '專業投資人-高資產' },
    { id: 10, name: '張榮均', profession: '商務中心-新莊' },
    { id: 11, name: '姚巧玲Amanda', profession: '包租代管-士林' },
    { id: 12, name: '蘇家弘Andre', profession: '包租代管-北投' },
    { id: 13, name: '莊雅嵐Scarlett', profession: '包租代管-高雄左營、鼓山、楠梓、三民' },
    { id: 14, name: '王鈞和Ray', profession: '包租代管-大同區' },
    { id: 15, name: '胡宇駿Josh', profession: '手工沙發-赫里亞' },
    { id: 16, name: '蔡文豪', profession: '房屋買賣-楊梅、中壢、平鎮、龍潭' },
    { id: 17, name: '方建勛/小巨', profession: '小巨除蟲專家-雙北' },
    { id: 18, name: '周庠', profession: '代租代管-台北市' },
    { id: 19, name: '黃馨嬋Sunny', profession: '包租代管-新北市雙和區' },
    { id: 20, name: '王俐穎', profession: '包租代管-台北市南港區' },
    { id: 21, name: '林雨青Queenie', profession: '包租代管-台北市' },
    { id: 23, name: '鍾依靜', profession: '小坪數空間造型師-台中' },
    { id: 24, name: '林純純Carrie', profession: '包租代管-新北市' },
    { id: 26, name: '林律吟Rita', profession: '包租代管-新北市' },
    { id: 27, name: '邱梅鈴', profession: '包租代管-新北市' },
    { id: 28, name: '周擇宇', profession: '包租代管-新北市' },
    { id: 29, name: '劉宜佳Carol', profession: '包租代管-新北市' },
    { id: 30, name: '李世偉Bob', profession: '包租代管-新北市' },
    { id: 31, name: '李佳玲Adline', profession: '包租代管-新北市' },
    { id: 32, name: '黃博俊Wally', profession: '包租代管-新北市' },
    { id: 33, name: '黃思齊Leti', profession: '包租代管-新北市' },
    { id: 34, name: '陳塵', profession: '包租代管-新北市' },
    { id: 35, name: '陳舒婷', profession: '包租代管-新北市' },
    { id: 36, name: '羅珮玉Ruby', profession: '包租代管-新北市' },
    { id: 37, name: '廖士鈞', profession: '包租代管-新北市' },
    { id: 38, name: '陳乙嘉', profession: '包租代管-新北市' },
    { id: 39, name: '黃鈺琦Rowan', profession: '包租代管-新北市' },
    { id: 40, name: '白岳霖Kelly', profession: '包租代管-新北市' },
    { id: 41, name: '賴易紃Ruby', profession: '包租代管-新北市' },
    { id: 42, name: '黃泓顥', profession: '包租代管-新北市' },
    { id: 43, name: '龔秋敏', profession: '包租代管-新北市' },
    { id: 44, name: '笠原藤真', profession: '包租代管-新北市' },
    { id: 45, name: '何欣哲Cliff', profession: '包租代管-新北市' },
    { id: 46, name: '陳貞茹Vivi', profession: '包租代管-新北市' },
    { id: 47, name: '陳力羣/娃娃', profession: '包租代管-新北市' },
    { id: 48, name: '陳逸凱/阿凱', profession: '包租代管-新北市' },
    { id: 49, name: '陳昱維Tony', profession: '包租代管-新北市' },
    { id: 50, name: '林柏蒼Kevin', profession: '包租代管-新北市' },
    { id: 51, name: '陳誌原', profession: '包租代管-新北市' },
    { id: 52, name: '林昱均Judy', profession: '包租代管-新北市' },
    { id: 53, name: '林易增Eason', profession: '包租代管-新北市' },
    { id: 54, name: '蔣京叡', profession: '包租代管-新北市' },
    { id: 55, name: '唐靖童Amy', profession: '包租代管-新北市' },
    { id: 56, name: '郭洲忠Joe', profession: '包租代管-新北市' },
    { id: 57, name: 'Josh Hung', profession: '包租代管-新北市' },
    { id: 58, name: '羅豪偉', profession: '包租代管-新北市' },
    { id: 59, name: '黃聖文Color', profession: '包租代管-新北市' },
    { id: 60, name: '林稼諭Jessica', profession: '包租代管-新北市' },
    { id: 61, name: '張簡筱凡Sarah', profession: '包租代管-新北市' },
    { id: 62, name: '陳姵璇Ann', profession: '包租代管-新北市' },
    { id: 63, name: '王勝仟Johnny', profession: '包租代管-新北市' },
    { id: 64, name: '劉怡吟', profession: '包租代管-新北市' },
    { id: 65, name: '吳富明Alan', profession: '包租代管-新北市' },
    { id: 66, name: '陳亞靖Emily', profession: '包租代管-新北市' },
    { id: 67, name: '丁乃玉', profession: '包租代管-新北市' },
    { id: 68, name: '楊麗華', profession: '包租代管-新北市' },
    { id: 69, name: '陳百毅', profession: '包租代管-新北市' },
    { id: 70, name: '沈琳朣Sophia', profession: '法拍屋代標-中部' },
    { id: 71, name: '王瑀Eva', profession: '企業形象官網（無購物車）-北部' },
    { id: 72, name: '黃靜愉', profession: '包租代管 (隔套出租)-台南中西區' },
    { id: 73, name: '蔡宜靜Ronda', profession: '包租代管-新竹市' },
    { id: 74, name: '田智娟Joanna', profession: '房東租房管理系統' },
    { id: 75, name: '黃彥銘', profession: '土地開發-台北市' },
    { id: 76, name: '申瑩萱Sally', profession: '房屋仲介業-台北市大安區、中正區' },
    { id: 77, name: '沈玲婕', profession: '科學風水命理教學' },
    { id: 78, name: '林裕翔Shawn', profession: '冷氣安裝保養維修- 雙北' },
    { id: 79, name: '陳啟宇Andy', profession: '買房陪跑教練- 雙北' },
    { id: 80, name: '游曉瑄Charming', profession: 'Meta廣告投放' },
    { id: 81, name: '廖瑀瑄Fay', profession: '歐必斯床墊' },
    { id: 82, name: '游珈嘉', profession: '建案品牌視覺設計- 北部' },
    { id: 83, name: '杜佳曄杜杜', profession: '藥局-桃園' },
    { id: 84, name: '張濬池', profession: '中小企業政府補助顧問- 高雄' },
    { id: 85, name: '陳閔祥James', profession: '法商策略顧問' },
    { id: 87, name: '謝慈軒', profession: '綠晶木環保建材' },
    { id: 88, name: '呂宥澄', profession: '飯店專業施工' },
    { id: 89, name: '陳家穎Queenie', profession: '包租代管-台北市松山西區（光復北路以西）' },
    { id: 90, name: '張家華', profession: '房屋仲介業-住宅-新北市雙和區' },
    { id: 91, name: '黃振呈', profession: '冷氣空調設備-北部' },
    { id: 92, name: '林典毅Chance', profession: '短影音代操' },
    { id: 93, name: '楊哲軒 Darren', profession: '居家收納用品電商' },
    { id: 94, name: '林怡均Karen', profession: '租賃企業管理系統 （ERP)' },
    { id: 95, name: '黃詩惠Katy', profession: 'AI設計師接案軟體' },
    { id: 96, name: '王文子', profession: '買房投資-高雄' },
    { id: 97, name: '顏敏哲', profession: '建築執照顧問' },
    { id: 98, name: '林鉦澤 (阿信）', profession: '房屋仲介業- 新北市三重、蘆洲' },
    { id: 99, name: '簡麒倫Chi Lu', profession: '包租代管業（隔套出租）- 台中市' },
    { id: 100, name: '廖宜勤-Daniel', profession: '影像直播服務' },
    { id: 101, name: '林雨軒', profession: '合法隔套設計裝修' },
    { id: 102, name: '唐瑋Oma', profession: '旅館商空室內設計師- 北部' },
    { id: 103, name: '左沁靈', profession: '綜合建材數位轉型' },
    { id: 104, name: '謝欣蓉/小布', profession: '毛一本唐揚茶漬- 新竹' },
    { id: 105, name: '陳俊翔AK', profession: '紫微風水命理規劃' },
    { id: 106, name: '范藝馨', profession: '理財型房貸-台北富邦銀行' },
    { id: 107, name: '康博勝', profession: '冷氣細清-桃竹苗' },
    { id: 108, name: '蔡明翰Marco', profession: '房屋仲介業- 新北市林口區' },
    { id: 109, name: '顏羽宏', profession: '一般照明設備' },
    { id: 110, name: '孫士閔', profession: 'AIoT物聯網平台' },
  ];
}

export default db;
