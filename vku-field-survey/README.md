# VKU Field Survey (Mini-Project 1)

Dự án ứng dụng web PWA phục vụ khảo sát hiện trường tại trường VKU, hỗ trợ lưu trữ dữ liệu offline bằng IndexedDB và tự động đồng bộ lên Google Sheets khi có kết nối mạng trở lại.

---

## 🔗 Liên kết đồ án
- **Demo Online (Vercel):** https://vku-field-survey-thhuong.vercel.app/survey.html
- **GitHub Repository:** (https://github.com/huongverse05/vku-field-survey)

---

## 📱 Các tính năng chính
- Cài đặt được lên màn hình chính điện thoại (Android & iOS) như app thông thường thông qua PWA manifest.
- Mở và sử dụng bình thường ngay cả khi không có mạng (nhờ Service Worker lưu cache HTML, CSS, JS).
- Nhập form khảo sát và lưu trữ tạm thời vào IndexedDB trên trình duyệt khi đang offline.
- Tự động bắt sự kiện mạng (`online`) để đẩy các phiếu đang chờ lên Google Sheets.
- Trang xem lại danh sách các phiếu khảo sát và trạng thái đồng bộ (Đã đồng bộ / Chờ đồng bộ).

---

## 🛠 Công nghệ sử dụng
- **Frontend:** HTML5, CSS3, JavaScript thuần (Vanilla JS).
- **Offline / PWA:** Service Worker (Cache Storage), IndexedDB.
- **Backend:** Python (Flask) kết nối Google Sheets API (`gspread`).
- **Deploy:** Vercel (Frontend).

---

## 📁 Cấu trúc thư mục

```text
vku-field-survey/
├── backend/
│   ├── app.py                # API nhận data và ghi vào Sheets
│   ├── requirements.txt
│   └── service_account.json  # Key Google Cloud (đã add .gitignore)
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── images/               # Icon PWA các kích thước
│   ├── js/
│   │   ├── app.js            # Đăng ký SW & bắt sự kiện online/offline
│   │   ├── db.js             # Mở và thao tác với IndexedDB
│   │   ├── survey.js         # Xử lý form khảo sát
│   │   └── sync.js           # Gửi dữ liệu về backend
│   ├── index.html            # Màn hình chính
│   ├── survey.html           # Màn hình form khảo sát
│   ├── result.html           # Danh sách phiếu đã lưu
│   ├── manifest.json
│   └── service-worker.js
└── README.md