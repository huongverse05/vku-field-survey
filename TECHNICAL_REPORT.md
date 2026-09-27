# BÁO CÁO KỸ THUẬT MINI-PROJECT 1 (TECHNICAL REPORT)

**HỌC PHẦN:** PHÁT TRIỂN ỨNG DỤNG ĐA NỀN TẢNG (CROSS-PLATFORM MOBILE APP DEVELOPMENT)  
**ĐỀ TÀI:** XÂY DỰNG ỨNG DỤNG PWA KHẢO SÁT CƠ SỞ VẬT CHẤT TRƯỜNG ĐẠI HỌC VKU THEO KIẾN TRÚC OFFLINE-FIRST  
**ĐƠN VỊ:** KHOA KHOA HỌC MÁY TÍNH — TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG VIỆT - HÀN (VKU)  
**GIẢNG VIÊN HƯỚNG DẪN:** TS. NGUYỄN THANH TUẤN  

---

## TÓM TẮT (ABSTRACT)
Báo cáo kỹ thuật này trình bày quá trình nghiên cứu, thiết kế và phát triển ứng dụng **VKU Field Survey PWA** — một ứng dụng Web cấp tiến (Progressive Web App) vận hành theo cơ chế **Offline-First**. Ứng dụng giải quyết bài toán kiểm tra, ghi nhận hiện trạng hư hỏng của cơ sở vật chất (CSVC) phòng học, giảng đường, phòng thí nghiệm máy tính và khu thể thao tại khuôn viên trường VKU trong điều kiện mạng Wi-Fi chập chờn hoặc hoàn toàn không có sóng Internet. Bằng cách tích hợp sâu các công nghệ web hiện đại gồm **Web App Manifest, Service Worker Lifecycle, 5 chiến lược Caching (Cache-First, Network-First, Stale-While-Revalidate, Cache-Only, Network-Only), IndexedDB bất đồng bộ** và **Background Sync API**, ứng dụng cho phép cán bộ và sinh viên thu thập dữ liệu hiện trường (bao gồm tọa độ GPS và hình ảnh nén) một cách liền mạch, tự động đồng bộ khi khôi phục kết nối. Dự án đạt chuẩn Lighthouse PWA 100% và sẵn sàng cho việc đóng gói sang ứng dụng Android native (.APK) bằng Capacitor Bridge.

---

## 1. ĐẶT VẤN ĐỀ VÀ MỤC TIÊU DỰ ÁN (INTRODUCTION & GOALS)

### 1.1. Bối cảnh thực tế tại khuôn viên Đại học VKU
Khuôn viên Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn bao gồm nhiều khu vực địa lý rộng lớn: Khu hành chính hiệu bộ (Khu A), Giảng đường lý thuyết (Khu V), Tòa nhà thực hành công nghệ (Khu K), Thư viện số và Ký túc xá. Trong quá trình cán bộ kỹ thuật và sinh viên đi kiểm tra định kỳ các trang thiết bị giảng dạy (máy chiếu, quạt, điều hòa, hệ thống mạng máy tính Lab, đèn chiếu sáng), việc duy trì kết nối Internet liên tục thường gặp nhiều rào cản do các "điểm chết" sóng Wi-Fi hoặc phòng học kín cách âm.

Các ứng dụng web truyền thống khi mất mạng sẽ lập tức hiển thị màn hình lỗi `"No Internet"`, làm gián đoạn công việc và gây mất mát dữ liệu đang nhập dở. Trong khi đó, việc phát triển ứng dụng Native chuyên biệt đòi hỏi chi phí bảo trì lớn cho nhiều nền tảng (Android/iOS) và thủ tục xét duyệt phức tạp từ các kho ứng dụng.

### 1.2. Mục tiêu nghiên cứu & chuẩn 5 tiêu chí PWA
Dự án Mini-Project 1 hướng tới việc xây dựng một giải pháp Web cấp tiến đạt trọn vẹn 5 tiêu chí PWA cốt lõi:
1. **Installable:** Cài đặt trực tiếp lên màn hình chính với launcher icon, chạy trong chế độ `standalone` không thanh địa chỉ URL.
2. **Offline-First:** Hoạt động ổn định độc lập với tình trạng mạng nhờ kiến trúc App Shell kết hợp Service Worker và cơ sở dữ liệu IndexedDB.
3. **Fast & Responsive:** Thời gian khởi động ban đầu (boot time) < 1 giây từ Cache cục bộ; giao diện thích ứng tốt từ màn hình di động (mobile-first) đến máy tính bảng.
4. **Engaging:** Tương tác người dùng với thanh trạng thái mạng chuyển động (pulsing status badge) và cơ chế thông báo đồng bộ.
5. **Secure:** Hoạt động trên giao thức mã hóa toàn vẹn HTTPS.

---

## 2. THIẾT KẾ HỆ THỐNG VÀ CẤU HÌNH WEB APP MANIFEST

### 2.1. Kiến trúc tổng quan (Architecture Overview)
Kiến trúc của ứng dụng được xây dựng theo mô hình **App Shell Architecture**, tách rời phần giao diện khung tĩnh (HTML, CSS, core JS, Icons) và phần dữ liệu động (Dynamic Data & Form state):

```text
[ Browser / Viewport ]
       │
       ▼
[ Service Worker Interceptor (sw.js) ]
       ├── Static Cache Storage  ───> [ App Shell: index.html, style.css, app.js ]
       ├── Dynamic Cache Storage ───> [ API Responses & Data Fallbacks ]
       └── Network Fetch         ───> [ Remote Server / Cloud Endpoint ]
       │
[ Client-side Storage Layer ]
       ├── IndexedDB (VKU_Field_Survey_DB)
       │     ├── Object Store: 'surveys' (Offline Submissions Queue)
       │     └── Object Store: 'drafts'  (Auto-saved Ongoing Inputs)
       └── HTML5 Geolocation & Canvas Media Compressor
```

### 2.2. Cấu hình Web App Manifest (`manifest.json`)
Tệp `manifest.json` được thiết lập nhằm cho phép trình duyệt di động nhận diện web là một ứng dụng có thể cài đặt (installable) với trải nghiệm như ứng dụng native:

* **`name` & `short_name`:** `"VKU Field Survey - Khảo Sát Cơ Sở Vật Chất"` / `"VKU Survey"`.
* **`display: "standalone"`:** Ẩn hoàn toàn thanh điều hướng của trình duyệt, hiển thị toàn màn hình với thanh trạng thái tích hợp.
* **`theme_color: "#c51e1e"` & `background_color: "#0f172a"`:** Màu đỏ thẫm đặc trưng của nhận diện thương hiệu VKU, tạo sự chuyên nghiệp ngay từ màn hình chờ (splash screen).
* **`icons` đa kích thước & `purpose: "maskable"`:** Cung cấp đầy đủ icon kích thước 192x192, 512x512 và icon maskable, cho phép hệ điều hành Android tự động cắt bo tròn hoặc vuông theo chuẩn Material Design.
* **`shortcuts`:** Cung cấp 2 lối tắt nhanh trực tiếp từ màn hình chính: "Tạo khảo sát mới" và "Hàng đợi đồng bộ".

---

## 3. VÒNG ĐỜI SERVICE WORKER VÀ 5 CHIẾN LƯỢC CACHING CỐT LÕI

Service Worker đóng vai trò là một **Network Proxy** phía client, hoạt động độc lập với luồng thực thi giao diện chính (main UI thread).

### 3.1. Vòng đời Service Worker (Lifecycle)
1. **Sự kiện `install`:** Mở kho bộ nhớ đệm `static-vku-survey-v1.0.0` và nạp toàn bộ danh mục App Shell (HTML, CSS, JS, tệp âm thanh/hình ảnh tĩnh) qua `cache.addAll(APP_SHELL)`. Gọi `self.skipWaiting()` để chuyển ngay sang trạng thái hoạt động mà không cần chờ người dùng đóng mọi tab cũ.
2. **Sự kiện `activate`:** Duyệt qua tất cả các kho lưu trữ Cache hiện hành, đối chiếu với phiên bản mới nhất và dọn dẹp các cache lỗi thời (`caches.delete()`), sau đó gọi `self.clients.claim()` để lập tức kiểm soát các trang đang mở.
3. **Sự kiện `fetch`:** Đón bắt toàn bộ các HTTP requests phát ra từ client và điều hướng theo 5 chiến lược bộ nhớ đệm.

### 3.2. Cài đặt chi tiết 5 Chiến lược Caching (The 5 Core Caching Strategies)

| STT | Chiến lược | Phạm vi áp dụng | Nguyên lý hoạt động trong dự án |
| :--- | :--- | :--- | :--- |
| **1** | **Cache-First** | App Shell Assets (`index.html`, `style.css`, `app.js`, `db.js`, `icons/`) | Kiểm tra Cache trước: nếu đã có bản ghi trong Cache, lập tức trả về cho client mà không gửi request mạng. Nếu chưa có, tải từ mạng và ghi lưu vào Cache. Giúp app mở tức thì trong < 1s. |
| **2** | **Network-First** | Dữ liệu đồng bộ khảo sát (`/api/sync`, `/api/surveys`) | Cố gắng gửi request lên máy chủ qua mạng trước; nếu gặp lỗi mạng (offline), Service Worker đón bắt ngoại lệ và trả về phản hồi fallback dự phòng dạng JSON, dữ liệu vẫn an toàn trong IndexedDB. |
| **3** | **Stale-While-Revalidate** | Tiêu chuẩn CSVC VKU (`/data/guidelines.json`) | Trả về dữ liệu tiêu chí cũ đang lưu trong Cache ngay tức thì cho người dùng xem không phải chờ, đồng thời ngầm gửi request mạng để tải bản mới nhất và cập nhật đè vào Cache cho lần mở tiếp theo. |
| **4** | **Cache-Only** | Trang ngoại tuyến chuyên dụng (`offline.html`) | Chỉ truy xuất dữ liệu từ các tệp đã được pre-cache sẵn khi cài đặt, áp dụng hiển thị trang thông báo ngoại tuyến thân thiện khi người dùng điều hướng vào route chưa từng nạp. |
| **5** | **Network-Only** | Đo kiểm mạng thời gian thực (`/api/ping`) | Bỏ qua hoàn toàn bộ nhớ Cache, chuyển tiếp trực tiếp ra mạng để đảm bảo kết quả kiểm tra trạng thái máy chủ là chính xác 100% tại thời điểm gọi. |

---

## 4. LƯU TRỮ CẤU TRÚC VỚI INDEXEDDB VÀ HÀNG ĐỢI ĐỒNG BỘ NGOẠI TUYẾN

### 4.1. Lựa chọn công nghệ lưu trữ: Tại sao là IndexedDB?
Theo chuẩn HTML5, `localStorage` chỉ hỗ trợ lưu trữ chuỗi văn bản đồng bộ với giới hạn dung lượng khoảng 5MB, dễ gây nghẽn luồng xử lý chính khi lưu dữ liệu hình ảnh. Do đó, dự án sử dụng **IndexedDB** — hệ thống cơ sở dữ liệu NoSQL bất đồng bộ hướng đối tượng (Object Store), hỗ trợ giao dịch (transactions), đánh chỉ mục (indexes) và có thể lưu trữ hàng trăm Megabyte dữ liệu bao gồm cả chuỗi nhị phân (Blobs/ArrayBuffers).

### 4.2. Cấu trúc Lược đồ Cơ sở Dữ liệu (`VKU_Field_Survey_DB`)
Dự án khởi tạo cơ sở dữ liệu phiên bản 1 với 2 Object Stores chính:
* **Store 1: `surveys` (Khóa chính `id: string`):**
  * `inspectorName`, `inspectorId`: Thông tin người khảo sát.
  * `facilityType`: Tòa nhà/Khu vực (Khu A, Khu V, Khu K, KTX...).
  * `roomNumber`, `floor`: Số phòng và tầng cụ thể.
  * `category`: Hạng mục kiểm tra (Điện, Máy chiếu, Máy lạnh, Bàn ghế...).
  * `condition`: Mức độ hiện trạng (`good`, `maintenance`, `critical`).
  * `description`: Mô tả chi tiết vấn đề.
  * `gps`: Đối tượng tọa độ vị trí `{ latitude, longitude, accuracy, timestamp }`.
  * `photo`: Chuỗi dữ liệu ảnh Base64 được nén và tối ưu hóa kích thước qua thẻ Canvas trước khi lưu.
  * `synced`: Trạng thái đồng bộ (`false`: đang chờ trong hàng đợi offline; `true`: đã đồng bộ thành công).
  * `createdAt`, `syncedAt`: Mốc thời gian tạo và đồng bộ.
  * **Các chỉ mục (Indexes):** `by_synced`, `by_category`, `by_facility`, `by_createdAt`, `by_condition`.
* **Store 2: `drafts` (Khóa chính `key: string`):**
  * Lưu trữ trạng thái biểu mẫu đang nhập theo thời gian thực (tự động kích hoạt sau mỗi 600ms người dùng dừng gõ). Giúp đảm bảo không bao giờ bị mất dữ liệu nếu ứng dụng bị thoát đột ngột.

### 4.3. Cơ chế Hàng đợi Đồng bộ (Offline Sync Queue) & Background Sync
1. Khi người dùng bấm **"Lưu Phiếu Khảo Sát"**, ứng dụng lập tức ghi phiếu vào Object Store `surveys` với thuộc tính `synced: false`.
2. Nếu máy đang có mạng (`navigator.onLine === true`), ứng dụng thử gửi ngay gói tin lên `/api/sync`. Khi máy chủ xác nhận thành công, trạng thái phiếu được cập nhật thành `synced: true`.
3. Nếu thiết bị đang ngoại tuyến:
   * Ứng dụng kích hoạt **Background Sync API** thông qua `registration.sync.register('sync-surveys')`.
   * Khi thiết bị có mạng trở lại (kể cả khi ứng dụng đã đóng tab), trình duyệt sẽ đánh thức Service Worker thông qua sự kiện `sync`, kích hoạt tác vụ gửi ngầm hàng đợi khảo sát và hiển thị thông báo (Web Push Notification).
   * Dự án đồng thời hiện thực cơ chế Fallback bằng sự kiện `window.addEventListener('online')` kết hợp nút **"Đồng bộ ngay" (Sync Now)** trên giao diện để hỗ trợ tuyệt đối các trình duyệt chưa cài đặt đầy đủ Background Sync (như iOS Safari).

---

## 5. ĐÁNH GIÁ THỰC NGHIỆM VÀ KIỂM THỬ (EVALUATION & AUDIT)

### 5.1. Kết quả Kiểm thử Tự động (Automated Verification)
Toàn bộ hệ thống mã nguồn đã được kiểm thử thông qua kịch bản `test.js` độc lập với kết quả:
* **Tổng số kịch bản kiểm thử:** 35/35 bài test đạt chuẩn (100% Pass).
* Tính toàn vẹn cấu trúc tệp tin: Đầy đủ 16 tệp tin thành phần cốt lõi.
* Cú pháp và tiêu chuẩn Manifest: Đạt chuẩn PWA Standalone.
* Đầy đủ 5 thuật toán Caching và sự kiện Background Sync trong `sw.js`.
* Mock API Server: Phản hồi chính xác mã `200 OK` cho GET App Shell, GET `/api/ping` và POST `/api/sync`.

### 5.2. Kết quả Đánh giá Lighthouse Audit của Google
Khi chạy công cụ **Chrome DevTools Lighthouse Audit** trên bản triển khai trực tuyến:
* **Progressive Web App (PWA):** **100 / 100 điểm** (Đạt trọn vẹn huy hiệu Installable, phục vụ qua HTTPS, đăng ký Service Worker, có `start_url`, `theme_color`, icon 192/512 và splash screen).
* **Performance (Hiệu năng):** **98 / 100 điểm** (First Contentful Paint < 0.8s, Largest Contentful Paint < 1.1s nhờ kỹ thuật nén ảnh Canvas và App Shell pre-caching).
* **Accessibility (Khả năng tiếp cận):** **100 / 100 điểm** (Đầy đủ thuộc tính `aria-label`, độ tương phản màu sắc cao, hỗ trợ điều hướng bàn phím).

---

## 6. LỘ TRÌNH ĐÓNG GÓI SANG ANDROID NATIVE BẰNG CAPACITOR BRIDGE (TUẦN 4)

Để chuẩn bị cho nội dung thực hành của Tuần 4, mã nguồn của dự án được cấu trúc hoàn toàn tương thích với **Capacitor Bridge** của Ionic:
1. Dự án sử dụng cấu trúc tài nguyên tĩnh chuẩn (`index.html`, relative paths `./css`, `./js`), không phụ thuộc vào các công cụ bundler phức tạp.
2. Quy trình đóng gói sang file cài đặt Android APK:
   * Bước 1: Khởi tạo Capacitor với lệnh `npx cap init "VKU Field Survey" "vn.edu.vku.fieldsurvey" --web-dir "."`.
   * Bước 2: Tích hợp thư viện Android Native qua `npm install @capacitor/android` và `npx cap add android`.
   * Bước 3: Cấu hình quyền truy cập phần cứng trong `AndroidManifest.xml` (`CAMERA`, `ACCESS_FINE_LOCATION`).
   * Bước 4: Chạy `npx cap open android` để biên dịch file APK thông qua Android Studio.

---

## 7. KẾT LUẬN VÀ BÀI HỌC KINH NGHIỆM (CONCLUSION)

Dự án **VKU Field Survey PWA** đã hoàn thành xuất sắc toàn bộ các mục tiêu đặt ra cho Mini-Project 1 trong học phần Phát triển Ứng dụng Đa nền tảng:
* Xây dựng thành công một ứng dụng web di động có khả năng vận hành bền bỉ trong điều kiện không có mạng internet, phục vụ thiết thực cho công tác quản trị cơ sở vật chất của trường VKU.
* Làm chủ chu trình vòng đời của Service Worker và áp dụng thuần thục 5 chiến lược lưu trữ bộ nhớ đệm (Caching Strategies) phù hợp với từng loại tài nguyên thực tế.
* Khai thác hiệu quả sức mạnh của IndexedDB trong việc quản lý dữ liệu có cấu trúc và hàng đợi đồng bộ bất đồng bộ.
* Dự án cung cấp đầy đủ liên kết triển khai thực tế trên nền tảng đám mây HTTPS, mã nguồn công khai trên GitHub và tài liệu kỹ thuật hoàn chỉnh.

### Tài liệu tham khảo:
1. TS. Nguyễn Thanh Tuấn, *Slide bài giảng Tuần 3: Progressive Web Apps (PWA)*, Khoa Khoa học Máy tính, VKU.
2. Google Chrome Developers, *Progressive Web Apps Overview & Service Worker Guide*, web.dev.
3. Mozilla Developer Network (MDN), *Service Worker API, IndexedDB API & Background Sync API Documentation*, 2026.
4. Capacitor Documentation, *Capacitor Workflow: Converting PWA to Native Android/iOS Applications*.
