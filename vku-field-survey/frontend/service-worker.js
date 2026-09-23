const CACHE_NAME = "vku-survey-v1";

const APP_SHELL = [
    "./",
    "./survey.html",
    "./result.html",
    "./manifest.json",
    "./css/style.css",
    "./js/app.js",
    "./js/db.js",
    "./js/survey.js",
    "./js/sync.js",
    "./images/icon-08.jpg",
    "./images/icon-09.jpg"
];

// 1. Install Event: Cache toàn bộ App Shell
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL);
        })
    );
    self.skipWaiting();
});

// 2. Activate Event: Dọn dẹp cache phiên bản cũ
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch Event: Áp dụng Cache-First cho App Shell & fallback an toàn
self.addEventListener("fetch", event => {
    // Bỏ qua các API POST gửi dữ liệu lên Google Sheets / Server Backend
    if (event.request.method !== "GET" || event.request.url.includes("/api/")) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // Fallback về trang survey.html nếu mất mạng khi chuyển trang
                if (event.request.headers.get("accept")?.includes("text/html")) {
                    return caches.match("./survey.html");
                }
            });
        })
    );
});