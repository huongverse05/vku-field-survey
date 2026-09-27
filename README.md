# 📱 VKU Field Survey PWA — Ứng dụng Khảo sát Cơ sở Vật chất Ngoại tuyến

> **Học phần:** Phát triển Ứng dụng Đa nền tảng (Cross-Platform Mobile App Development)  
> **Tuần 3 — Progressive Web Apps (PWA) • Mini-Project 1**  
> **Khoa:** Khoa Khoa học Máy tính (Faculty of Computer Science)  
> **Đơn vị:** Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU)  
> **Giảng viên hướng dẫn:** TS. Nguyễn Thanh Tuấn  

---

## 🎯 Mục tiêu Dự án (Mini-Project 1 Kickoff)
Xây dựng một ứng dụng Web cấp tiến (**Progressive Web App - PWA**) theo kiến trúc **Offline-First**, phục vụ công tác kiểm định và ghi nhận hiện trạng cơ sở vật chất (CSVC) phòng học, giảng đường, phòng Lab và khuôn viên trường Đại học VKU khi thiết bị **hoàn toàn mất kết nối mạng (Zero Network Connectivity)**.

Ứng dụng đáp ứng chuẩn mực 5 tiêu chí PWA theo bài giảng:
1. **Installable (Cài đặt):** Cài trực tiếp lên màn hình chính thiết bị di động/máy tính với launcher icon riêng, chạy toàn màn hình (Standalone display mode).
2. **Offline-First (Ưu tiên ngoại tuyến):** Hoạt động mượt mà khi không có Internet thông qua **Service Worker + Cache API** và cơ sở dữ liệu cục bộ **IndexedDB**.
3. **Fast & Responsive (Nhanh & Tương thích):** Khởi động dưới 1 giây từ App Shell Cache, tương thích hoàn hảo mọi kích thước màn hình điện thoại/máy tính bảng.
4. **Engaging (Tương tác cao):** Hỗ trợ thông báo đồng bộ, giao diện native mobile trực quan với hệ thống thông báo trạng thái mạng real-time.
5. **Secure (Bảo mật):** Hoạt động nghiêm ngặt trên giao thức bảo mật HTTPS.

---

## 🏗️ Kiến trúc & Tính năng Nổi bật

### 1. 5 Chiến lược Caching cốt lõi (5 Core Caching Strategies)
Được cài đặt chi tiết trong `sw.js`:
* **Cache-First (App Shell):** Tải ngay lập tức các tệp tĩnh (HTML, CSS, JS, Icon SVG/PNG) từ bộ nhớ Cache, không cần kết nối mạng.
* **Network-First (Live Data & Sync):** Thử gửi yêu cầu khảo sát lên Server; nếu ngoại tuyến sẽ tự động chuyển sang lưu tạm trong IndexedDB.
* **Stale-While-Revalidate (Tiêu chuẩn CSVC):** Trả về dữ liệu tiêu chuẩn kiểm định ngay tức thì từ Cache cho người dùng xem, đồng thời âm thầm gửi request ngầm cập nhật phiên bản mới nhất từ máy chủ.
* **Cache-Only (Trang Offline Fallback):** Cung cấp trang báo lỗi thân thiện được lưu trước khi người dùng truy cập một route chưa được cache trong trạng thái offline.
* **Network-Only (Ping / Telemetry):** Kết nối trực tiếp máy chủ cho các yêu cầu kiểm tra tình trạng kết nối mạng thời gian thực.

### 2. Quản lý dữ liệu cục bộ với IndexedDB
* Cơ sở dữ liệu bất đồng bộ `VKU_Field_Survey_DB` dung lượng lớn.
* **Object Store `surveys`**: Lưu trữ các phiếu khảo sát, hỗ trợ lưu trữ ảnh chụp hiện trường (chuỗi base64 đã nén qua HTML5 Canvas) và tọa độ GPS (`navigator.geolocation`).
* **Hàng đợi đồng bộ (Sync Queue)**: Đánh dấu trạng thái `synced: false` khi ngoại tuyến, tự động chuyển `synced: true` khi kết nối mạng được khôi phục.
* **Tự động lưu bản nháp (Offline Draft Persistence)**: Tự động lưu mọi thay đổi trong quá trình nhập liệu vào Object Store `drafts`, chống mất mát dữ liệu khi tải lại trang hoặc hết pin.

### 3. Background Sync API & Fallback cơ chế Online
* Tích hợp sự kiện `'sync'` với tag `'sync-surveys'` của Service Worker.
* Fallback lắng nghe sự kiện `window.addEventListener('online')` đảm bảo hoạt động trơn tru trên mọi trình duyệt (kể cả Safari iOS).

---

## 📂 Cấu trúc Thư mục Dự án

```text
vku-field-survey-pwa/
├── index.html              # Giao diện chính (App Shell, Form khảo sát, Hàng đợi, Thống kê)
├── offline.html            # Trang Offline fallback (Cache-Only Strategy)
├── manifest.json           # Web App Manifest cấu hình PWA (Standalone, theme, icons)
├── sw.js                   # Service Worker (Vòng đời Install, Activate, Fetch & 5 Caching Strategies)
├── server.js               # Dev server nhẹ tích hợp Mock API (/api/sync, /api/ping)
├── package.json            # Cấu hình scripts (npm start, npm test)
├── vercel.json             # Cấu hình Header Service-Worker-Allowed cho Vercel
├── _headers                # Cấu hình Header cho Cloudflare Pages
├── css/
│   └── style.css           # Giao diện hiện đại, mobile-first chuẩn nhận diện thương hiệu VKU
├── js/
│   ├── app.js              # Xử lý sự kiện UI, định vị GPS, nén ảnh, điều phối Sync
│   ├── db.js               # Lớp giao tiếp IndexedDB bất đồng bộ (Promise-based)
│   └── sw-register.js      # Đăng ký Service Worker và quản lý Background Sync
├── data/
│   └── guidelines.json     # Dữ liệu tiêu chí đánh giá phòng học (Minh họa Stale-While-Revalidate)
├── icons/
│   ├── icon.svg            # Vector icon sắc nét
│   ├── icon-192.png        # Icon launcher 192x192
│   ├── icon-512.png        # Icon launcher 512x512
│   └── icon-maskable.png   # Icon chuẩn maskable thích ứng Android
└── TECHNICAL_REPORT.md     # Báo cáo kỹ thuật chi tiết nộp bài (2–4 trang)
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy Thử trên Máy Cục bộ

### Yêu cầu:
* Đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 18 trở lên).

### Bước 1: Mở thư mục dự án trong Terminal
```bash
cd vku-field-survey-pwa
```

### Bước 2: Chạy kiểm thử tự động toàn bộ tính năng
```bash
npm test
```
*(Hệ thống sẽ chạy qua 35 bài kiểm tra tự động về tính hợp lệ của Manifest, Service Worker, IndexedDB và Mock API).*

### Bước 3: Khởi chạy máy chủ phát triển
```bash
npm start
```
Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 🌐 Hướng dẫn Triển khai Trực tuyến (Live Deployed HTTPS)

### Cách 1: Triển khai lên Vercel (Khuyên dùng)
1. Đẩy mã nguồn lên một Public GitHub Repository:
   ```bash
   git init
   git add .
   git commit -m "feat: complete VKU Field Survey PWA with offline-first support"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/vku-field-survey-pwa.git
   git push -u origin main
   ```
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
3. Nhấn **"Add New"** > **"Project"** > Chọn repository `vku-field-survey-pwa`.
4. Giữ nguyên các thiết lập mặc định (Framework Preset: Other) và nhấn **"Deploy"**.
5. Nhận đường link HTTPS công khai (ví dụ: `https://vku-field-survey-pwa.vercel.app`).

### Cách 2: Triển khai lên Cloudflare Pages
1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) > Chọn **Workers & Pages** > **Create application** > **Pages**.
2. Chọn **Connect to Git** và chọn repository GitHub của bạn.
3. Build command: *(để trống)*, Build output directory: `.`
4. Nhấn **Save and Deploy**. Cloudflare Pages sẽ tự động kích hoạt HTTPS và đọc tệp `_headers`.

---

## 🔍 Hướng dẫn Kiểm tra Chế độ Ngoại tuyến (DevTools Testing Guide)

1. Mở ứng dụng trên Google Chrome. Nhấn phím `F12` để mở **Chrome DevTools**.
2. **Kiểm tra Service Worker:**
   * Mở tab **Application** > **Service Workers**.
   * Quan sát trạng thái: `Status: #... activated and is running`.
   * Tích chọn ô checkbox **Offline**.
3. **Thực hiện khảo sát khi ngoại tuyến:**
   * Trên giao diện app, huy hiệu trạng thái sẽ chuyển sang màu cam **"Ngoại tuyến"** cùng biểu ngữ thông báo.
   * Điền thông tin một phiếu khảo sát cơ sở vật chất (chụp ảnh, chọn tòa nhà, phòng, hạng mục).
   * Nhấn **"Lưu Phiếu Khảo Sát"**.
   * Phiếu sẽ lưu thành công với huy hiệu: `⏳ Chờ gửi (Offline)`.
4. **Kiểm tra IndexedDB:**
   * Trong tab **Application** > **IndexedDB** > `VKU_Field_Survey_DB` > `surveys`.
   * Nhấn chuột phải chọn **Refresh Database**. Bạn sẽ thấy bản ghi được lưu hoàn chỉnh với `synced: false`.
5. **Kiểm tra tự động đồng bộ (Auto Sync):**
   * Bỏ tích chọn ô **Offline** trên DevTools để khôi phục mạng.
   * Ứng dụng phát hiện trạng thái mạng phục hồi, tự động gửi dữ liệu lên server và đổi trạng thái sang `✓ Đã đồng bộ`.
6. **Kiểm tra điểm PWA (Lighthouse Audit):**
   * Mở tab **Lighthouse** trên DevTools > Chọn danh mục **Progressive Web App** > Nhấn **Analyze page load**.
   * Điểm đánh giá sẽ đạt 100% với huy hiệu PWA Badge xanh.

---

## 📲 Chuẩn bị cho Tuần tiếp theo: Đóng gói Android APK bằng Capacitor Bridge

Trong Tuần 4, dự án này đã sẵn sàng 100% để đóng gói thành ứng dụng di động Android Native (.APK) thông qua Capacitor:

```bash
# 1. Cài đặt Capacitor Core & CLI
npm install @capacitor/core
npm install --save-dev @capacitor/cli

# 2. Khởi tạo cấu hình Capacitor
npx cap init "VKU Field Survey" "vn.edu.vku.fieldsurvey" --web-dir "."

# 3. Thêm nền tảng Android
npm install @capacitor/android
npx cap add android

# 4. Mở trong Android Studio và tạo APK
npx cap open android
```
*(Do cấu trúc mã nguồn sử dụng đường dẫn tương đối và HTML5 APIs chuẩn, ứng dụng sẽ chạy native mượt mà trên môi trường Webview của Android).*

---

## 📄 Bản quyền & Tác giả
* Sinh viên thực hiện: Sinh viên Khoa KHMT - VKU
* Giảng viên: TS. Nguyễn Thanh Tuấn
* Học kỳ: Học kỳ 1 - Năm học 2026-2027
