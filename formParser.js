const axios = require('axios');

/**
 * Phân tích URL Google Form công khai và trích xuất thông tin các trường nhập liệu.
 * @param {string} url - URL của Google Form
 * @returns {Promise<{title: string, submitUrl: string, questions: Array}>}
 */
async function parseGoogleForm(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = response.data;
    
    // Tìm biến FB_PUBLIC_LOAD_DATA_ chứa cấu trúc form
    const regex = /FB_PUBLIC_LOAD_DATA_\s*=\s*(.*?);<\/script>/s;
    const match = html.match(regex);
    if (!match) {
      throw new Error('Không thể tìm thấy dữ liệu cấu trúc form. Hãy chắc chắn đây là link Google Form công khai.');
    }
    
    let rawData;
    try {
      rawData = JSON.parse(match[1]);
    } catch (e) {
      // Trong trường hợp JSON chứa các thành phần không chuẩn, thử sử dụng eval an toàn
      // (hoặc lọc bỏ ký tự thừa vì Google Form đôi khi chứa ký tự trống/null lạ)
      const cleanJsonStr = match[1]
        .replace(/,+/g, ',')
        .replace(/\[,/g, '[')
        .replace(/,\]/g, ']');
      rawData = JSON.parse(cleanJsonStr);
    }
    
    // Trích xuất tiêu đề Form và danh sách câu hỏi
    const formTitle = rawData[1][8] || rawData[1][0] || 'Google Form';
    const questionsData = rawData[1][1] || [];
    const questions = [];
    
    for (const q of questionsData) {
      if (!q) continue;
      
      const title = q[1];
      const typeCode = q[3];
      const entryData = q[4];
      
      // Nếu không có thông tin trường hoặc ID, bỏ qua
      if (!entryData || !entryData[0]) continue;
      
      const entryIdNumber = entryData[0][0];
      if (entryIdNumber === null || entryIdNumber === undefined) continue;
      
      const entryId = `entry.${entryIdNumber}`;
      
      // Xác định loại câu hỏi
      let type = 'unknown';
      if (typeCode === 0) type = 'text';
      else if (typeCode === 1) type = 'paragraph';
      else if (typeCode === 2) type = 'radio';
      else if (typeCode === 3) type = 'dropdown';
      else if (typeCode === 4) type = 'checkbox';
      
      // Trích xuất các tùy chọn lựa chọn (ví dụ: Danh sách tên, Check-in/Checkout)
      const rawOptions = entryData[0][1] || [];
      const options = rawOptions.map(opt => opt[0]).filter(opt => opt !== null && opt !== undefined);
      
      questions.push({
        id: entryId,
        title: title,
        type: type,
        options: options
      });
    }
    
    // Tạo link submit (/formResponse) từ link gốc
    const cleanUrl = url.split('?')[0];
    const formResponseUrl = cleanUrl.replace(/\/viewform|\/edit|\/formResponse/g, '') + '/formResponse';
    
    return {
      title: formTitle,
      submitUrl: formResponseUrl,
      questions: questions
    };
  } catch (error) {
    console.error('Error parsing Google Form:', error);
    throw new Error('Lỗi khi tải hoặc phân tích Google Form: ' + error.message);
  }
}

module.exports = { parseGoogleForm };
