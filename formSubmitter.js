const axios = require('axios');

/**
 * Gửi dữ liệu điền vào Google Form qua HTTP POST request.
 * @param {string} submitUrl - URL submit của Google Form (đuôi /formResponse)
 * @param {Object} fields - Đối tượng chứa dữ liệu gửi đi (key là entry.ID, value là giá trị điền)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function submitGoogleForm(submitUrl, fields) {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (key && value !== undefined && value !== null) {
        params.append(key, value);
      }
    }
    
    const response = await axios.post(submitUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000 // Hạn giờ 10 giây
    });
    
    // Google Forms trả về mã 200 kèm HTML xác nhận thành công
    if (response.status === 200) {
      // Có thể quét chuỗi HTML để chắc chắn phản hồi đã được ghi nhận
      const html = response.data;
      if (html.includes('đã được ghi nhận') || html.includes('recorded') || html.includes('response')) {
        return { success: true, message: 'Gửi biểu mẫu thành công và đã được Google ghi nhận!' };
      } else {
        return { success: true, message: 'Gửi biểu mẫu thành công (Không chắc chắn Google ghi nhận thành công).' };
      }
    } else {
      return { success: false, message: `Google Forms phản hồi mã trạng thái lỗi: ${response.status}` };
    }
  } catch (error) {
    console.error('Error submitting Google Form:', error);
    // Nếu có phản hồi từ server nhưng lỗi (ví dụ mã 400, 404, 500)
    if (error.response) {
      return {
        success: false,
        message: `Lỗi từ Google Server (Status: ${error.response.status}): ${error.response.statusText}`
      };
    }
    return { success: false, message: `Lỗi kết nối mạng: ${error.message}` };
  }
}

module.exports = { submitGoogleForm };
