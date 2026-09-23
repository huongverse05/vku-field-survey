document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("surveyForm");
  const rating = document.getElementById("rating");
  const ratingValue = document.getElementById("ratingValue");
  const saveMessage = document.getElementById("saveMessage");

  // Hiển thị giá trị rating theo thanh kéo (slider)
  if (rating && ratingValue) {
    rating.addEventListener("input", () => {
      ratingValue.textContent = rating.value;
    });
  }

  // Sinh ID duy nhất cho phiếu khảo sát
  function createSurveyId() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "survey_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }

  // Xử lý nộp form khảo sát
  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const qualityElement = document.querySelector('input[name="quality"]:checked');
      if (!qualityElement) {
        if (saveMessage) {
          saveMessage.innerHTML = `<div class="error" style="color: red; margin-top: 10px;">Vui lòng chọn Đạt hoặc Không đạt.</div>`;
        }
        return;
      }

      const survey = {
        id: createSurveyId(),
        createdAt: new Date().toISOString(),
        investigator: document.getElementById("investigator")?.value.trim() || "",
        location: document.getElementById("location")?.value.trim() || "",
        facilityType: document.getElementById("facilityType")?.value || "",
        quality: qualityElement.value,
        rating: Number(rating?.value || 3),
        comment: document.getElementById("comment")?.value.trim() || "",
        status: "pending"
      };

      try {
        // Lưu an toàn vào IndexedDB trước theo mô hình Offline-First
        await saveSurvey(survey);

        if (saveMessage) {
          saveMessage.innerHTML = `
            <div class="success" style="color: #137333; margin-top: 10px;">
              ✓ Phiếu đã được lưu an toàn trên thiết bị.
            </div>
          `;
        }

        // Reset form về trạng thái ban đầu
        form.reset();
        if (rating && ratingValue) {
          rating.value = 3;
          ratingValue.textContent = 3;
        }

        // Kiểm tra mạng và tiến hành đồng bộ
        if (navigator.onLine) {
          if (saveMessage) {
            saveMessage.innerHTML = `
              <div class="success" style="color: #137333; margin-top: 10px;">
                ✓ Đã lưu trên thiết bị.<br>
                Đang trực tuyến – đang tiến hành đồng bộ dữ liệu...
              </div>
            `;
          }

          if (typeof syncPendingSurveys === "function") {
            await syncPendingSurveys();
            if (saveMessage) {
              saveMessage.innerHTML = `
                <div class="success" style="color: #137333; margin-top: 10px;">
                  ✓ Đã đồng bộ thành công lên máy chủ Google Sheets!
                </div>
              `;
            }
          }
        } else {
          if (saveMessage) {
            saveMessage.innerHTML = `
              <div class="info" style="color: #003399; margin-top: 10px;">
                ✓ Bạn đang ngoại tuyến (Offline).<br>
                Phiếu đã được lưu vào IndexedDB và sẽ tự động gửi khi có mạng.
              </div>
            `;
          }
        }

        // Tự động xóa thông báo sau 5 giây
        setTimeout(() => {
          if (saveMessage) saveMessage.innerHTML = "";
        }, 5000);

      } catch (error) {
        console.error("LỖI LƯU PHIẾU:", error);
        if (saveMessage) {
          saveMessage.innerHTML = `
            <div class="error" style="color: red; margin-top: 10px;">
              ❌ Không thể lưu phiếu.<br>
              Lỗi: ${error.message}
            </div>
          `;
        }
      }
    });
  }
});