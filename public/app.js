// Khai báo biến toàn cục lưu trữ thông tin câu hỏi của Form được phân tích
let parsedQuestions = [];
let schedulerActive = false;
let configData = {};

// Định dạng ngày hiển thị trong log
function formatDateTime(dateTimeStr) {
  return dateTimeStr;
}

// Toast thông báo
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 4000);
}

// Lấy thông tin cấu hình từ Server
async function fetchConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    configData = config;
    
    // Gán dữ liệu lên UI lịch trình từng ngày
    if (config.schedule) {
      for (const [day, dayConfig] of Object.entries(config.schedule)) {
        const row = document.querySelector(`.day-schedule-row[data-day="${day}"]`);
        if (row) {
          const activeCheck = row.querySelector('.day-active-check');
          const checkinInput = row.querySelector('.day-checkin-time');
          const checkoutInput = row.querySelector('.day-checkout-time');
          
          activeCheck.checked = !!dayConfig.active;
          checkinInput.value = dayConfig.checkin || '';
          checkoutInput.value = dayConfig.checkout || '';
          
          // Cập nhật trạng thái hiển thị
          if (dayConfig.active) {
            row.classList.remove('inactive');
          } else {
            row.classList.add('inactive');
          }
        }
      }
    }

    // Cập nhật trạng thái scheduler
    schedulerActive = config.schedulerActive;
    updateSchedulerStatusUI(schedulerActive);

    // Điền URL Google Form
    if (config.formUrl) {
      document.getElementById('form-url-input').value = config.formUrl;
      // Tự động phân tích Form nếu đã lưu URL từ trước
      await analyzeForm(config.formUrl, config);
    }
  } catch (error) {
    console.error('Lỗi khi tải cấu hình:', error);
    showToast('Không thể kết nối đến máy chủ cấu hình.', 'error');
  }
}

// Cập nhật giao diện trạng thái Lập lịch
function updateSchedulerStatusUI(active) {
  const badge = document.getElementById('status-badge');
  const text = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-scheduler-btn');

  if (active) {
    badge.className = 'scheduler-status active';
    text.textContent = 'Lập lịch: ĐANG BẬT';
    toggleBtn.textContent = 'Tắt Bộ Lập Lịch';
    toggleBtn.className = 'btn outline-btn w-full';
  } else {
    badge.className = 'scheduler-status inactive';
    text.textContent = 'Lập lịch: ĐANG TẮT';
    toggleBtn.textContent = 'Bật Bộ Lập Lịch';
    toggleBtn.className = 'btn accent-btn w-full';
  }
}

// Tự động điền đường dẫn hiện tại vào hướng dẫn Task Scheduler
function updateDocPath() {
  // Lấy đường dẫn động thông qua API nếu cần, tạm thời hiển thị đường dẫn chuẩn
  const projectPathBox = document.getElementById('project-path-box');
  // Phục vụ hiển thị chính xác
  projectPathBox.textContent = `C:\\Users\\quang\\.gemini\\antigravity\\scratch\\google-form-auto-submit`;
}

// Phân tích Google Form
async function analyzeForm(url, savedConfig = null) {
  if (!url) return;

  const btn = document.getElementById('analyze-btn');
  const loading = document.getElementById('analysis-loading');
  const mappingContainer = document.getElementById('mapping-container');

  btn.disabled = true;
  loading.classList.remove('hidden');
  mappingContainer.classList.remove('show');

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }

    const { title, questions } = result.data;
    parsedQuestions = questions;

    // Hiển thị tiêu đề biểu mẫu
    document.getElementById('form-title').textContent = `📄 Biểu mẫu: ${title}`;

    // Làm rỗng các dropdown
    const nameFieldSelect = document.getElementById('name-field-select');
    const actionFieldSelect = document.getElementById('action-field-select');
    nameFieldSelect.innerHTML = '<option value="">-- Chọn câu hỏi --</option>';
    actionFieldSelect.innerHTML = '<option value="">-- Chọn câu hỏi --</option>';

    // Đổ dữ liệu câu hỏi vào Select
    questions.forEach(q => {
      const opt1 = document.createElement('option');
      opt1.value = q.id;
      opt1.textContent = q.title;
      nameFieldSelect.appendChild(opt1);

      // Thường thì chỉ câu hỏi dạng Radio, Dropdown mới làm Checkin/Checkout
      if (q.type === 'radio' || q.type === 'dropdown') {
        const opt2 = document.createElement('option');
        opt2.value = q.id;
        opt2.textContent = q.title;
        actionFieldSelect.appendChild(opt2);
      }
    });

    // Bắt sự kiện thay đổi câu hỏi chọn Tên
    nameFieldSelect.onchange = function() {
      const qId = this.value;
      const valueSelect = document.getElementById('name-value-select');
      valueSelect.innerHTML = '';
      
      const question = parsedQuestions.find(q => q.id === qId);
      if (question && question.options) {
        question.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          valueSelect.appendChild(o);
        });
      }
    };

    // Bắt sự kiện thay đổi câu hỏi chọn Hành động (Check-in / Check-out)
    actionFieldSelect.onchange = function() {
      const qId = this.value;
      const checkinSelect = document.getElementById('checkin-value-select');
      const checkoutSelect = document.getElementById('checkout-value-select');
      
      checkinSelect.innerHTML = '<option value="">-- Chọn --</option>';
      checkoutSelect.innerHTML = '<option value="">-- Chọn --</option>';

      const question = parsedQuestions.find(q => q.id === qId);
      if (question && question.options) {
        question.options.forEach(opt => {
          const o1 = document.createElement('option');
          o1.value = opt;
          o1.textContent = opt;
          checkinSelect.appendChild(o1);

          const o2 = document.createElement('option');
          o2.value = opt;
          o2.textContent = opt;
          checkoutSelect.appendChild(o2);
        });
      }
    };

    // Ánh xạ lại cấu hình đã lưu trước đó nếu có
    if (savedConfig) {
      if (savedConfig.nameEntryId) {
        nameFieldSelect.value = savedConfig.nameEntryId;
        nameFieldSelect.dispatchEvent(new Event('change'));
        if (savedConfig.nameValue) {
          document.getElementById('name-value-select').value = savedConfig.nameValue;
        }
      }
      if (savedConfig.actionEntryId) {
        actionFieldSelect.value = savedConfig.actionEntryId;
        actionFieldSelect.dispatchEvent(new Event('change'));
        if (savedConfig.checkinValue) {
          document.getElementById('checkin-value-select').value = savedConfig.checkinValue;
        }
        if (savedConfig.checkoutValue) {
          document.getElementById('checkout-value-select').value = savedConfig.checkoutValue;
        }
      }
    }

    mappingContainer.classList.add('show');
    showToast('Phân tích Google Form thành công!', 'success');
  } catch (error) {
    console.error(error);
    showToast('Lỗi: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    loading.classList.add('hidden');
  }
}

// Lưu cấu hình xuống server
async function saveConfig() {
  const formUrl = document.getElementById('form-url-input').value.trim();
  const nameEntryId = document.getElementById('name-field-select').value;
  const nameValue = document.getElementById('name-value-select').value;
  const actionEntryId = document.getElementById('action-field-select').value;
  const checkinValue = document.getElementById('checkin-value-select').value;
  const checkoutValue = document.getElementById('checkout-value-select').value;

  if (!formUrl) {
    return showToast('Vui lòng điền link Google Form.', 'error');
  }
  if (!nameEntryId || !nameValue) {
    return showToast('Vui lòng chọn câu hỏi chọn Tên và tùy chọn tên.', 'error');
  }
  if (!actionEntryId || !checkinValue || !checkoutValue) {
    return showToast('Vui lòng ánh xạ đầy đủ thông tin Check-in / Check-out.', 'error');
  }

  // Thu thập lịch trình từng ngày
  const schedule = {};
  document.querySelectorAll('.day-schedule-row').forEach(row => {
    const day = row.getAttribute('data-day');
    const active = row.querySelector('.day-active-check').checked;
    const checkin = row.querySelector('.day-checkin-time').value;
    const checkout = row.querySelector('.day-checkout-time').value;
    
    schedule[day] = { active, checkin, checkout };
  });

  const payload = {
    formUrl,
    nameEntryId,
    nameValue,
    actionEntryId,
    checkinValue,
    checkoutValue,
    schedule,
    schedulerActive
  };

  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.success) {
      showToast('Đã lưu cấu hình và khởi chạy bộ lịch thành công!', 'success');
      fetchLogs();
    } else {
      showToast('Lưu thất bại: ' + result.message, 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối máy chủ.', 'error');
  }
}

// Tắt/bật Bộ lập lịch
async function toggleScheduler() {
  const newStatus = !schedulerActive;
  try {
    const response = await fetch('/api/scheduler/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: newStatus })
    });
    const result = await response.json();
    if (result.success) {
      schedulerActive = newStatus;
      updateSchedulerStatusUI(schedulerActive);
      showToast(result.message, 'success');
    }
  } catch (error) {
    showToast('Không thể thay đổi trạng thái lập lịch.', 'error');
  }
}

// Gọi API chạy thử
async function testSubmit(type) {
  const btn = type === 'checkin' ? document.getElementById('test-checkin-btn') : document.getElementById('test-checkout-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  try {
    const response = await fetch('/api/submit-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    const result = await response.json();
    if (result.success) {
      showToast(`Gửi thử ${type.toUpperCase()} thành công!`, 'success');
    } else {
      showToast(`Gửi thử thất bại: ${result.message}`, 'error');
    }
    await fetchLogs();
  } catch (error) {
    showToast('Lỗi mạng không thể gửi thử.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Tải lịch sử logs
async function fetchLogs() {
  try {
    const response = await fetch('/api/logs');
    const logs = await response.json();
    const tbody = document.getElementById('logs-tbody');
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center">Chưa có nhật ký hoạt động nào. Hãy cấu hình và bắt đầu chạy thử.</td></tr>`;
      return;
    }

    logs.forEach(log => {
      const tr = document.createElement('tr');
      
      const tdTime = document.createElement('td');
      tdTime.textContent = formatDateTime(log.timestamp);
      tr.appendChild(tdTime);

      const tdType = document.createElement('td');
      const typeBadge = document.createElement('span');
      typeBadge.className = `badge badge-${log.type}`;
      typeBadge.textContent = log.type === 'checkin' ? 'Check-in' : 'Check-out';
      tdType.appendChild(typeBadge);

      const tdPayload = document.createElement('td');
      if (log.payload) {
        const payloadText = Object.entries(log.payload)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        tdPayload.textContent = payloadText;
      } else {
        tdPayload.textContent = '-';
      }
      tr.appendChild(tdPayload);

      const tdStatus = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.className = log.success ? 'badge badge-success' : 'badge badge-error';
      statusBadge.textContent = log.success ? 'Thành công' : 'Thất bại';
      tdStatus.appendChild(statusBadge);

      const tdMessage = document.createElement('td');
      tdMessage.textContent = log.message;
      tr.appendChild(tdMessage);

      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Lỗi khi tải nhật ký hoạt động:', error);
  }
}

// Bắt các sự kiện
document.addEventListener('DOMContentLoaded', () => {
  fetchConfig();
  fetchLogs();
  updateDocPath();

  // Bắt sự kiện bật/tắt ngày hoạt động để ẩn/hiện input time
  document.querySelectorAll('.day-active-check').forEach(check => {
    check.addEventListener('change', function() {
      const row = this.closest('.day-schedule-row');
      if (this.checked) {
        row.classList.remove('inactive');
      } else {
        row.classList.add('inactive');
      }
    });
  });

  document.getElementById('analyze-btn').addEventListener('click', () => {
    const url = document.getElementById('form-url-input').value.trim();
    if (!url) return showToast('Vui lòng nhập URL biểu mẫu.', 'error');
    analyzeForm(url);
  });

  document.getElementById('save-config-btn').addEventListener('click', saveConfig);
  document.getElementById('toggle-scheduler-btn').addEventListener('click', toggleScheduler);
  
  document.getElementById('test-checkin-btn').addEventListener('click', () => testSubmit('checkin'));
  document.getElementById('test-checkout-btn').addEventListener('click', () => testSubmit('checkout'));
  
  document.getElementById('refresh-logs-btn').addEventListener('click', () => {
    fetchLogs();
    showToast('Đã làm mới nhật ký!', 'success');
  });
});
