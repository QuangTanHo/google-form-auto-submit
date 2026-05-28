# Công Cụ Tự Động Điền & Gửi Google Form (Check-in/Checkout)

Công cụ hỗ trợ tự động gửi dữ liệu điểm danh check-in và checkout lên biểu mẫu Google Form theo khung giờ cố định trong tuần. Dự án hỗ trợ cả giao diện trực quan (Web Dashboard) và cơ chế chạy ẩn độc lập (CLI + Windows Task Scheduler).

## 🚀 Tính Năng Nổi Bật

- **Phân Tích URL Tự Động**: Chỉ cần dán link Google Form, hệ thống sẽ tự quét và bóc tách các câu hỏi, danh sách tên và các nút chọn Check-in/Checkout.
- **Không Dùng Trình Duyệt Ảo (Không Chrome Headless)**: Gửi request POST trực tiếp siêu nhẹ, cực kỳ nhanh, tiết kiệm RAM và ổn định tuyệt đối (không lo bị lệch layout/nút bấm).
- **Web Dashboard Hiện Đại**: Giao diện tối mờ (Dark Mode Glassmorphism) hiển thị tình trạng bộ lập lịch, lịch trình và lịch sử nhật ký nộp.
- **Hỗ Trợ Windows Task Scheduler**: Cung cấp script CLI để lập lịch trực tiếp bằng công cụ của Windows, giúp chạy tự động mà không cần giữ cửa sổ ứng dụng hay server luôn mở.

---

## 🛠️ Hướng Dẫn Sử Dụng Nhanh

### Bước 1: Cài đặt và Khởi chạy Dashboard
1. Đảm bảo máy tính đã cài đặt **Node.js**.
2. Mở cửa sổ terminal trong thư mục này và chạy lệnh:
   ```bash
   npm start
   ```
3. Truy cập vào đường dẫn: **[http://localhost:3000](http://localhost:3000)** trên trình duyệt.

### Bước 2: Thiết lập cấu hình điểm danh
1. **Dán link Google Form** của bạn vào ô nhập liệu và nhấn **Phân Tích**.
2. Sau khi hệ thống phân tích xong, tại giao diện cấu hình mở ra:
   - Chọn câu hỏi đại diện cho việc **chọn Tên**.
   - Chọn **Tên của bạn** trong danh sách dropdown.
   - Chọn câu hỏi đại diện cho việc **Check-in / Check-out**.
   - Chọn các giá trị tương ứng của nút bấm trên Form (ví dụ: nút Check-in và nút Check-out).
3. Đặt **Giờ Check-in** và **Giờ Check-out** (ví dụ: `08:00` và `17:00`).
4. Tích chọn **Các ngày hoạt động** (mặc định là Thứ 2 đến Thứ 6).
5. Nhấn **Lưu Cấu Hình**.
6. Nhấn **Bật Bộ Lập Lịch** để kích hoạt tự động chạy (nếu muốn chạy qua máy chủ luôn bật).

### Bước 3: Kiểm tra thử nghiệm
- Nhấn nút **Test Check-in** hoặc **Test Check-out** tại khu vực "Gửi thử thủ công".
- Kiểm tra trang tính Google Sheets liên kết với biểu mẫu của bạn xem kết quả đã được nộp thành công chưa.
- Kiểm tra bảng **Nhật ký hoạt động (Logs)** ở cuối trang để xem lịch sử nộp.

---

## ⏰ Cấu Hình Chạy Ẩn Qua Windows Task Scheduler (Khuyên Dùng)

Nếu bạn không muốn duy trì cửa sổ terminal mở 24/7, bạn có thể thiết lập để Windows tự động kích hoạt gửi form khi tới giờ:

1. Nhấn phím `Windows`, gõ tìm kiếm và mở **Task Scheduler**.
2. Tại cột bên phải, chọn **Create Basic Task...**:
   - **Name**: `Google Form Auto Checkin`
   - **Trigger**: Chọn `Daily` (Hàng ngày).
   - **Start**: Đặt thời gian bắt đầu trùng với giờ Check-in của bạn. Lặp lại mỗi `1` ngày.
   - **Action**: Chọn `Start a program`.
   - **Program/script**: Gõ `node`.
   - **Add arguments**: Gõ `cli.js --type=checkin`.
   - **Start in**: Dán đường dẫn thư mục dự án này:
     `C:\Users\quang\.gemini\antigravity\scratch\google-form-auto-submit`
3. Nhấn **Finish**.
4. Làm tương tự cho một Task thứ hai cho Checkout:
   - **Name**: `Google Form Auto Checkout`
   - **Trigger**: Khung giờ chiều trùng với giờ Checkout.
   - **Action**: `Start a program` -> `node`.
   - **Add arguments**: `cli.js --type=checkout`.
   - **Start in**: `C:\Users\quang\.gemini\antigravity\scratch\google-form-auto-submit`.

*Lưu ý: Đảm bảo Node.js đã được thêm vào biến môi trường PATH của Windows (mặc định khi cài Node.js đã tự thêm).*

---

## 📂 Danh Sách Tệp Tin
- `server.js`: Máy chủ chính Express phục vụ API và Dashboard UI, đồng thời quản lý cron job ngầm.
- `cli.js`: Script gọi lệnh trực tiếp từ Terminal/Task Scheduler để gửi form lập tức.
- `formParser.js`: Thư viện bóc tách và phân tích các trường của Google Form.
- `formSubmitter.js`: Thư viện gửi dữ liệu lên Google Server bằng giao thức HTTP POST.
- `config.json`: File lưu trữ cấu hình hiện tại và nhật ký lịch sử gửi form.
- `public/`: Thư mục chứa giao diện HTML/CSS/JS của Web Dashboard.
