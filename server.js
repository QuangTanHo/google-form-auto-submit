const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { parseGoogleForm } = require('./formParser');
const { submitGoogleForm } = require('./formSubmitter');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');
const CRON_SECRET = process.env.CRON_SECRET || '';
// Hỗ trợ chạy under subpath (vd: insnailssupply.com/gg-form) trên cPanel Passenger.
// Đặt env var BASE_PATH=/gg-form trong Setup Node.js App; bỏ trống nếu chạy ở root.
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

if (BASE_PATH) {
  app.use((req, res, next) => {
    if (req.url === BASE_PATH) {
      req.url = '/';
    } else if (req.url.startsWith(BASE_PATH + '/') || req.url.startsWith(BASE_PATH + '?')) {
      req.url = req.url.slice(BASE_PATH.length) || '/';
    }
    next();
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Đọc cấu hình từ file
let config = {
  formUrl: "",
  nameEntryId: "",
  nameValue: "",
  actionEntryId: "",
  checkinValue: "",
  checkoutValue: "",
  schedule: {
    "1": { "active": true, "checkin": "08:00", "checkout": "17:00" },
    "2": { "active": true, "checkin": "08:00", "checkout": "17:00" },
    "3": { "active": true, "checkin": "08:00", "checkout": "17:00" },
    "4": { "active": true, "checkin": "08:00", "checkout": "17:00" },
    "5": { "active": true, "checkin": "08:00", "checkout": "17:00" },
    "6": { "active": false, "checkin": "09:00", "checkout": "12:00" },
    "7": { "active": false, "checkin": "09:00", "checkout": "12:00" }
  },
  schedulerActive: false,
  logs: []
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = { ...config, ...JSON.parse(data) };
      console.log('[Config] Đã tải cấu hình thành công.');
    }
  } catch (error) {
    console.error('[Config] Lỗi khi đọc file cấu hình:', error);
  }
}

function saveConfig() {
  try {
    if (config.logs && config.logs.length > 100) {
      config.logs = config.logs.slice(0, 100);
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('[Config] Đã lưu cấu hình xuống file.');
  } catch (error) {
    console.error('[Config] Lỗi khi lưu file cấu hình:', error);
  }
}

// Danh sách các tiến trình Cron đang chạy
let activeJobs = [];

// Hàm thực hiện tự động gửi form
async function runAutoSubmit(type) {
  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`[Scheduler] Kích hoạt gửi form tự động: ${type.toUpperCase()} vào lúc ${timestamp}`);

  if (!config.formUrl || !config.nameEntryId || !config.nameValue || !config.actionEntryId) {
    addLog({
      id: Date.now().toString(),
      timestamp,
      type,
      success: false,
      message: 'Lỗi: Chưa cấu hình đầy đủ thông tin Form (URL, Trường tên, Trường hành động).'
    });
    return;
  }

  const actionValue = type === 'checkin' ? config.checkinValue : config.checkoutValue;
  if (!actionValue) {
    addLog({
      id: Date.now().toString(),
      timestamp,
      type,
      success: false,
      message: `Lỗi: Chưa cấu hình giá trị hành động cho ${type}.`
    });
    return;
  }

  const fields = {
    [config.nameEntryId]: config.nameValue,
    [config.actionEntryId]: actionValue
  };

  const submitUrl = config.formUrl.split('?')[0].replace(/\/viewform|\/edit|\/formResponse/g, '') + '/formResponse';

  const result = await submitGoogleForm(submitUrl, fields);

  addLog({
    id: Date.now().toString(),
    timestamp,
    type,
    success: result.success,
    message: result.message,
    payload: fields
  });
}

function addLog(logEntry) {
  if (!config.logs) config.logs = [];
  config.logs.unshift(logEntry);
  saveConfig();
}

// Bắt đầu lập lịch chạy tự động bằng Cron
function startScheduler() {
  // Dừng toàn bộ tác vụ cũ
  activeJobs.forEach(job => job.stop());
  activeJobs = [];

  if (!config.schedulerActive) {
    console.log('[Scheduler] Bộ lập lịch hiện đang tắt.');
    return;
  }

  console.log('[Scheduler] Đang thiết lập lịch trình từng ngày...');

  for (const [dayStr, dayConfig] of Object.entries(config.schedule)) {
    if (!dayConfig.active) continue;

    const dayNum = parseInt(dayStr);
    const cronDay = dayNum === 7 ? 0 : dayNum; // node-cron dùng 0 làm Chủ Nhật, 1-6 cho Thứ 2 - Thứ 7

    // Lên lịch Check-in
    if (dayConfig.checkin) {
      const [hour, minute] = dayConfig.checkin.split(':');
      const cronExpr = `${minute} ${hour} * * ${cronDay}`;
      const job = cron.schedule(cronExpr, () => runAutoSubmit('checkin'), {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh'
      });
      activeJobs.push(job);
      console.log(`[Scheduler] Đã đặt lịch Check-in lúc ${dayConfig.checkin} vào Thứ ${dayNum === 7 ? 'CN' : dayNum + 1}`);
    }

    // Lên lịch Check-out
    if (dayConfig.checkout) {
      const [hour, minute] = dayConfig.checkout.split(':');
      const cronExpr = `${minute} ${hour} * * ${cronDay}`;
      const job = cron.schedule(cronExpr, () => runAutoSubmit('checkout'), {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh'
      });
      activeJobs.push(job);
      console.log(`[Scheduler] Đã đặt lịch Check-out lúc ${dayConfig.checkout} vào Thứ ${dayNum === 7 ? 'CN' : dayNum + 1}`);
    }
  }
}

// --- API ENDPOINTS ---

// Lấy cấu hình hiện tại
app.get('/api/config', (req, res) => {
  res.json({
    formUrl: config.formUrl,
    nameEntryId: config.nameEntryId,
    nameValue: config.nameValue,
    actionEntryId: config.actionEntryId,
    checkinValue: config.checkinValue,
    checkoutValue: config.checkoutValue,
    schedule: config.schedule,
    schedulerActive: config.schedulerActive
  });
});

// Lưu cấu hình mới
app.post('/api/config', (req, res) => {
  const {
    formUrl,
    nameEntryId,
    nameValue,
    actionEntryId,
    checkinValue,
    checkoutValue,
    schedule,
    schedulerActive
  } = req.body;

  config.formUrl = formUrl || "";
  config.nameEntryId = nameEntryId || "";
  config.nameValue = nameValue || "";
  config.actionEntryId = actionEntryId || "";
  config.checkinValue = checkinValue || "";
  config.checkoutValue = checkoutValue || "";
  if (schedule) {
    config.schedule = schedule;
  }
  config.schedulerActive = !!schedulerActive;

  saveConfig();
  startScheduler();

  res.json({ success: true, message: 'Lưu cấu hình thành công!' });
});

// Phân tích Google Form URL
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Thiếu đường dẫn Google Form.' });
  }

  try {
    const data = await parseGoogleForm(url);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Trực tiếp gửi thử form thủ công từ UI
app.post('/api/submit-test', async (req, res) => {
  const { type } = req.body;
  if (!type || (type !== 'checkin' && type !== 'checkout')) {
    return res.status(400).json({ success: false, message: 'Kiểu gửi thử không hợp lệ.' });
  }

  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  if (!config.formUrl || !config.nameEntryId || !config.nameValue || !config.actionEntryId) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền và lưu đầy đủ cấu hình Form trước khi test.' });
  }

  const actionValue = type === 'checkin' ? config.checkinValue : config.checkoutValue;
  if (!actionValue) {
    return res.status(400).json({ success: false, message: `Vui lòng đặt giá trị lựa chọn cho hành động ${type}.` });
  }

  const fields = {
    [config.nameEntryId]: config.nameValue,
    [config.actionEntryId]: actionValue
  };

  const submitUrl = config.formUrl.split('?')[0].replace(/\/viewform|\/edit|\/formResponse/g, '') + '/formResponse';

  const result = await submitGoogleForm(submitUrl, fields);

  addLog({
    id: Date.now().toString(),
    timestamp,
    type,
    success: result.success,
    message: result.message + ' (Gửi thử thủ công)',
    payload: fields
  });

  res.json({ success: result.success, message: result.message });
});

// Lấy lịch sử Logs
app.get('/api/logs', (req, res) => {
  res.json(config.logs || []);
});

// Lấy giờ Việt Nam hiện tại bất kể server timezone.
// Trả về { day: 1..7 (T2..CN), hhmm: "HH:MM" }
function getVNNow() {
  const now = new Date();
  const hhmm = now.toLocaleString('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const weekdayShort = now.toLocaleString('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short'
  });
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { day: map[weekdayShort], hhmm };
}

// Endpoint cPanel cron gọi MỖI PHÚT. Server tự đọc config + giờ VN để quyết định.
// Một cron job duy nhất: * * * * * curl https://.../api/cron-tick?token=...
app.get('/api/cron-tick', async (req, res) => {
  const { token } = req.query;

  if (!CRON_SECRET) {
    return res.status(500).json({ success: false, message: 'CRON_SECRET chưa được cấu hình.' });
  }
  if (token !== CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
  }
  if (!config.schedulerActive) {
    return res.json({ success: true, message: 'Scheduler đang tắt, bỏ qua.' });
  }

  const { day, hhmm } = getVNNow();
  const dayConfig = config.schedule && config.schedule[String(day)];

  if (!dayConfig || !dayConfig.active) {
    return res.json({ success: true, message: `Ngày ${day} không active.`, vnTime: hhmm });
  }

  const triggered = [];
  if (dayConfig.checkin === hhmm) {
    await runAutoSubmit('checkin');
    triggered.push('checkin');
  }
  if (dayConfig.checkout === hhmm) {
    await runAutoSubmit('checkout');
    triggered.push('checkout');
  }

  res.json({
    success: true,
    message: triggered.length ? `Đã kích hoạt: ${triggered.join(', ')}` : 'Chưa đến giờ.',
    vnTime: hhmm,
    day
  });
});

// Endpoint cho cPanel Cron Jobs gọi định kỳ (GET để dùng curl/wget được).
// Truyền ?type=checkin|checkout&token=<CRON_SECRET>
// CRON_SECRET đặt qua biến môi trường trong "Setup Node.js App" của cPanel.
app.get('/api/cron-trigger', async (req, res) => {
  const { type, token } = req.query;

  if (!CRON_SECRET) {
    return res.status(500).json({ success: false, message: 'CRON_SECRET chưa được cấu hình trên server.' });
  }
  if (token !== CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
  }
  if (type !== 'checkin' && type !== 'checkout') {
    return res.status(400).json({ success: false, message: 'type phải là checkin hoặc checkout.' });
  }

  await runAutoSubmit(type);
  res.json({ success: true, message: `Đã kích hoạt ${type} qua cron.` });
});

// Bật/tắt nhanh bộ lập lịch
app.post('/api/scheduler/toggle', (req, res) => {
  const { active } = req.body;
  config.schedulerActive = !!active;
  saveConfig();
  startScheduler();
  res.json({ success: true, message: `Bộ lập lịch đã ${config.schedulerActive ? 'BẬT' : 'TẮT'}` });
});

// Khởi chạy
loadConfig();
startScheduler();

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  MÁY CHỦ TỰ ĐỘNG GỬI GOOGLE FORM ĐANG CHẠY`);
  console.log(`  Địa chỉ Dashboard: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
