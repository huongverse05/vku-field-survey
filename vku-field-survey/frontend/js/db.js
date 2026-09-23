const DB_NAME = "VKUFieldSurveyDB";
const DB_VERSION = 1;
const STORE_NAME = "surveys";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
      }
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      console.error("❌ IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Lưu hoặc cập nhật bản ghi khảo sát
async function saveSurvey(survey) {
  const db = await openDatabase();

  // Đảm bảo luôn có ID hợp lệ cho keyPath
  if (!survey.id) {
    survey.id = "survey_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Mặc định gán trạng thái pending nếu chưa có
  if (!survey.status) {
    survey.status = "pending";
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(survey);

    request.onsuccess = function () {
      resolve(survey);
    };

    request.onerror = function (event) {
      console.error("saveSurvey error:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Lấy toàn bộ danh sách khảo sát trong máy
async function getAllSurveys() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

// Chỉ lấy những bản ghi chưa đồng bộ (status: "pending")
async function getPendingSurveys() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.getAll("pending");

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

// Xóa bản ghi theo ID (dùng sau khi đồng bộ thành công hoặc xóa thủ công)
async function deleteSurvey(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}