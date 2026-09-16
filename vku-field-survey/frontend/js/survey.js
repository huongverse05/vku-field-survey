const form = document.getElementById("surveyForm");
const rating = document.getElementById("rating");
const ratingValue = document.getElementById("ratingValue");
const saveMessage = document.getElementById("saveMessage");


// Hiển thị mức đánh giá
rating.addEventListener("input", () => {
    ratingValue.textContent = rating.value;
});


// Tạo ID cho phiếu
function createSurveyId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString() + "-" + Math.random().toString(36).substring(2);
}


// Xử lý lưu phiếu
form.addEventListener("submit", async function (event) {

    event.preventDefault();

    console.log("=== BẮT ĐẦU LƯU PHIẾU ===");

    const qualityElement =
        document.querySelector('input[name="quality"]:checked');

    if (!qualityElement) {
        saveMessage.innerHTML =
            `<div class="error">Vui lòng chọn Có hoặc Không.</div>`;
        return;
    }

    const survey = {
        id: createSurveyId(),

        createdAt: new Date().toISOString(),

        investigator:
            document.getElementById("investigator").value,

        location:
            document.getElementById("location").value,

        facilityType:
            document.getElementById("facilityType").value,

        quality:
            qualityElement.value,

        rating:
            Number(rating.value),

        comment:
            document.getElementById("comment").value,

        status: "pending"
    };

    console.log("Dữ liệu phiếu:", survey);

    try {

        // Lưu vào IndexedDB
        await saveSurvey(survey);

        console.log("✓ Đã lưu IndexedDB");

        saveMessage.innerHTML =
            `<div class="success">
                ✓ Phiếu đã được lưu trên thiết bị.
            </div>`;

        // Xóa form
        form.reset();

        rating.value = 3;
        ratingValue.textContent = 3;

        // Nếu đang online thì thử đồng bộ
        if (navigator.onLine) {

            console.log("Đang online → thử đồng bộ");

                saveMessage.innerHTML =
                    `<div class="success">
                        ✓ Phiếu đã được lưu trên thiết bị.<br>
                        Bạn đang online – đang thử đồng bộ dữ liệu...
                    </div>`;

  

            if (typeof syncPendingSurveys === "function") {
                await syncPendingSurveys();
            }

        } else {

            console.log("Đang offline → giữ phiếu trên thiết bị");

                saveMessage.innerHTML =
                    `<div class="success">
                        ✓ Phiếu đã được lưu trên thiết bị.<br>
                        
                        Bạn đang offline – phiếu sẽ được đồng bộ khi có Internet.
                     </div>`;

        }

    } catch (error) {

        console.error("LỖI LƯU PHIẾU:", error);

        saveMessage.innerHTML =
            `<div class="error">
                Không thể lưu phiếu.<br>
                Lỗi: ${error.message}
            </div>`;
    }
});