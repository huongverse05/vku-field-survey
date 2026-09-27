/**
 * Automated Verification & PWA Compliance Test for VKU Field Survey PWA
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('--- BẮT ĐẦU KIỂM THỬ VKU FIELD SURVEY PWA ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

// 1. Check required files
const requiredFiles = [
  'index.html',
  'offline.html',
  'manifest.json',
  'sw.js',
  'css/style.css',
  'js/app.js',
  'js/db.js',
  'js/sw-register.js',
  'data/guidelines.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable.png',
  'icons/icon.svg',
  'server.js',
  'vercel.json',
  '_headers'
];

console.log('\n1. Kiểm tra sự tồn tại của tệp tin dự án:');
requiredFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `Tệp tin tồn tại: ${file}`);
});

// 2. Validate manifest.json
console.log('\n2. Kiểm tra tính hợp lệ của Web App Manifest (manifest.json):');
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  assert(manifest.name && manifest.name.includes('VKU'), 'Manifest có trường "name" phù hợp VKU');
  assert(manifest.short_name, 'Manifest có trường "short_name"');
  assert(manifest.display === 'standalone', 'Manifest cài đặt display mode là "standalone" (Yêu cầu PWA)');
  assert(manifest.start_url, 'Manifest có start_url');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Manifest có đầy đủ icon mảng kích thước (192, 512, maskable)');
} catch (e) {
  assert(false, `Lỗi đọc manifest.json: ${e.message}`);
}

// 3. Validate Service Worker (sw.js)
console.log('\n3. Kiểm tra các chiến lược bộ nhớ đệm trong Service Worker (sw.js):');
const swContent = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
assert(swContent.includes('cacheFirstStrategy'), 'Chiến lược 1: Cache-First (App Shell)');
assert(swContent.includes('networkFirstStrategy'), 'Chiến lược 2: Network-First (Live Data & Sync)');
assert(swContent.includes('staleWhileRevalidateStrategy'), 'Chiến lược 3: Stale-While-Revalidate (Guidelines & Notice)');
assert(swContent.includes('cacheOnlyStrategy'), 'Chiến lược 4: Cache-Only (Offline fallback)');
assert(swContent.includes('networkOnlyStrategy'), 'Chiến lược 5: Network-Only (Telemetry & Ping)');
assert(swContent.includes('sync-surveys'), 'Tích hợp Background Sync API (sync event)');

// 4. Validate IndexedDB (js/db.js)
console.log('\n4. Kiểm tra cấu trúc lưu trữ IndexedDB (js/db.js):');
const dbContent = fs.readFileSync(path.join(__dirname, 'js/db.js'), 'utf8');
assert(dbContent.includes('indexedDB.open'), 'Khởi tạo IndexedDB native');
assert(dbContent.includes('STORE_SURVEYS'), 'Tạo Object Store cho phiếu khảo sát');
assert(dbContent.includes('STORE_DRAFTS'), 'Tạo Object Store cho bản nháp tự động lưu (Offline draft persistence)');
assert(dbContent.includes('by_synced'), 'Chỉ mục by_synced phục vụ hàng đợi đồng bộ');

// 5. Test Live Server Endpoints
console.log('\n5. Kiểm tra Dev Server và các Mock API Endpoint:');
const testPort = 3999;
process.env.PORT = testPort;
const server = require('./server.js');

setTimeout(() => {
  // Request /index.html
  http.get(`http://localhost:${testPort}/`, (res) => {
    assert(res.statusCode === 200, 'HTTP GET / trả về mã 200 OK');
    assert(res.headers['service-worker-allowed'] === '/', 'Có Header Service-Worker-Allowed: /');

    // Request /api/ping
    http.get(`http://localhost:${testPort}/api/ping`, (pingRes) => {
      assert(pingRes.statusCode === 200, 'HTTP GET /api/ping (Network-Only) trả về 200 OK');

      // Request POST /api/sync
      const postData = JSON.stringify({ id: 'test-123', facilityType: 'Khu A' });
      const req = http.request({
        hostname: 'localhost',
        port: testPort,
        path: '/api/sync',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (syncRes) => {
        assert(syncRes.statusCode === 200, 'HTTP POST /api/sync (Sync Queue) xử lý thành công');
        
        console.log(`\n======================================================`);
        console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST THÀNH CÔNG!`);
        console.log(`======================================================\n`);
        process.exit(passedTests === totalTests ? 0 : 1);
      });

      req.write(postData);
      req.end();
    });
  });
}, 500);
