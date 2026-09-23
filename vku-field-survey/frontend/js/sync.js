const API_URL = "http://127.0.0.1:5000/api/survey";
let isSyncing = false;

async function syncPendingSurveys() {
    // 1. Kiểm tra trạng thái mạng
    if (!navigator.onLine) {
        console.log("🔴 Offline - chưa thể đồng bộ");
        return;
    }

    // 2. Chặn chạy trùng lặp nếu tiến trình đồng bộ trước đó chưa hoàn tất
    if (isSyncing) {
        console.log("⏳ Quá trình đồng bộ đang chạy, bỏ qua yêu cầu gọi lặp");
        return;
    }

    isSyncing = true;
    console.log("🟢 Online - bắt đầu quét dữ liệu đồng bộ");

    try {
        const surveys = await getAllSurveys();
        const pendingSurveys = surveys.filter(
            survey => survey.status === "pending"
        );

        console.log(`Có ${pendingSurveys.length} phiếu chờ đồng bộ`);

        if (pendingSurveys.length === 0) {
            isSyncing = false;
            return;
        }

        // 3. Đồng bộ tuần tự từng phiếu
        for (const survey of pendingSurveys) {
            try {
                console.log("Đang gửi phiếu:", survey.id);

                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(survey)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();
                console.log("Server phản hồi thành công:", result);

                // Cập nhật trạng thái trong IndexedDB
                survey.status = "synced";
                survey.syncedAt = new Date().toISOString();
                await saveSurvey(survey);

                console.log("✓ Đã đánh dấu đồng bộ:", survey.id);

            } catch (error) {
                console.error("Không thể đồng bộ phiếu:", survey.id, error);
                // Dừng vòng lặp nếu lỗi xuất phát từ phía server API
                break;
            }
        }

        console.log("✓ HOÀN TẤT ĐỒNG BỘ");

        // Cập nhật số đếm trên giao diện nếu hàm tồn tại
        if (typeof updateQueueBadge === "function") {
            updateQueueBadge();
        }

    } catch (error) {
        console.error("Lỗi tiến trình sync:", error);
    } finally {
        isSyncing = false;
    }
}

// Lắng nghe sự kiện kết nối lại Internet
window.addEventListener("online", () => {
    console.log("Internet đã kết nối lại");
    syncPendingSurveys();
});

// Kiểm tra đồng bộ khi tải xong trang
window.addEventListener("load", () => {
    syncPendingSurveys();
});

// Đăng ký alias cho các file script khác gọi dùng
window.syncPendingSurveys = syncPendingSurveys;
window.syncSurveys = syncPendingSurveys;
window.triggerSync = syncPendingSurveys;