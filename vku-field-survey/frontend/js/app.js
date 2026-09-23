// 1. Đăng ký Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./service-worker.js");
      console.log("Service Worker registered successfully:", reg.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}

// 2. Cập nhật trạng thái hiển thị Online / Offline
function updateNetworkStatus() {
  const element = document.getElementById("networkStatus");
  if (!element) return;

  if (navigator.onLine) {
    element.textContent = "🟢 Đang online";
    element.className = "status-online";
  } else {
    element.textContent = "🔴 Đang offline";
    element.className = "status-offline";
  }
}

// 3. Lắng nghe thay đổi kết nối mạng
window.addEventListener("online", () => {
  updateNetworkStatus();
  // Kích hoạt đồng bộ dữ liệu ngoại tuyến
  if (typeof syncOfflineSurveys === "function") {
    syncOfflineSurveys();
  } else if (typeof triggerSync === "function") {
    triggerSync();
  }
});

window.addEventListener("offline", updateNetworkStatus);

// Đảm bảo DOM sẵn sàng trước khi gán text trạng thái ban đầu
window.addEventListener("DOMContentLoaded", updateNetworkStatus);