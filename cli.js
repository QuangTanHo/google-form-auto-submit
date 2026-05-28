const fs = require('fs');
const path = require('path');
const { submitGoogleForm } = require('./formSubmitter');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
  console.error('Không tìm thấy file config.json. Hãy chạy Dashboard và cấu hình trước.');
  process.exit(1);
}

function saveConfig(config) {
  if (config.logs && config.logs.length > 100) {
    config.logs = config.logs.slice(0, 100);
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  let type = '';
  
  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      type = arg.split('=')[1];
    } else if (arg === 'checkin' || arg === 'checkout') {
      type = arg;
    }
  }

  if (type !== 'checkin' && type !== 'checkout') {
    console.error('Vui lòng chỉ định loại hành động: node cli.js --type=checkin HOẶC node cli.js --type=checkout');
    process.exit(1);
  }

  const config = loadConfig();

  // Kiểm tra xem ngày hôm nay có được cấu hình hoạt động không
  const today = new Date().getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  const dayNum = today === 0 ? 7 : today;
  if (config.schedule && config.schedule[dayNum]) {
    if (!config.schedule[dayNum].active) {
      console.log(`[CLI] Bỏ qua gửi biểu mẫu: Hôm nay (Thứ ${dayNum === 7 ? 'CN' : dayNum + 1}) được thiết lập không hoạt động.`);
      process.exit(0);
    }
  }

  if (!config.formUrl || !config.nameEntryId || !config.nameValue || !config.actionEntryId) {
    console.error('Lỗi: Chưa cấu hình đầy đủ thông tin Form. Vui lòng cấu hình qua giao diện Dashboard trước.');
    process.exit(1);
  }

  const actionValue = type === 'checkin' ? config.checkinValue : config.checkoutValue;
  if (!actionValue) {
    console.error(`Lỗi: Chưa cấu hình giá trị hành động cho ${type} trong config.json.`);
    process.exit(1);
  }

  const fields = {
    [config.nameEntryId]: config.nameValue,
    [config.actionEntryId]: actionValue
  };

  const submitUrl = config.formUrl.split('?')[0].replace(/\/viewform|\/edit|\/formResponse/g, '') + '/formResponse';
  const timestamp = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  
  console.log(`[CLI] Bắt đầu gửi form tự động: ${type.toUpperCase()}...`);
  const result = await submitGoogleForm(submitUrl, fields);
  console.log(`[CLI] Kết quả: ${result.success ? 'THÀNH CÔNG' : 'THẤT BẠI'} - ${result.message}`);

  const logEntry = {
    id: Date.now().toString(),
    timestamp,
    type,
    success: result.success,
    message: result.message + ' (Kích hoạt qua CLI)',
    payload: fields
  };

  if (!config.logs) config.logs = [];
  config.logs.unshift(logEntry);
  saveConfig(config);

  process.exit(result.success ? 0 : 1);
}

main();
