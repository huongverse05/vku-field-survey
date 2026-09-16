const API_URL = "http://127.0.0.1:5000/api/survey";

async function syncPendingSurveys() {

    // Không có Internet
    if (!navigator.onLine) {

        console.log("🔴 Offline - chưa đồng bộ");

        return;
    }


    console.log("🟢 Online - bắt đầu đồng bộ");


    try {

        const surveys = await getAllSurveys();

        const pendingSurveys =
            surveys.filter(
                survey => survey.status === "pending"
            );


        console.log(
            `Có ${pendingSurveys.length} phiếu chờ đồng bộ`
        );


        // Không có phiếu cần đồng bộ
        if (pendingSurveys.length === 0) {

            console.log("Không có phiếu chờ");

            return;
        }


        // Đồng bộ từng phiếu
        for (const survey of pendingSurveys) {

            try {

                console.log(
                    "Đang gửi phiếu:",
                    survey.id
                );


                const response = await fetch(
                    API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(survey)
                    }
                );


                console.log(
                    "Server response:",
                    response.status
                );


                // Server không trả thành công
                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );
                }


                const result =
                    await response.json();


                console.log(
                    "Server trả về:",
                    result
                );

                survey.status = "synced";

                survey.syncedAt =
                    new Date().toISOString();


                await saveSurvey(survey);


                console.log(
                    "Đã đồng bộ:",
                    survey.id
                );


            } catch (error) {

                console.error(
                    "Không thể đồng bộ:",
                    survey.id,
                    error
                );

            }

        }


        console.log(
            "HOÀN TẤT ĐỒNG BỘ"
        );

    } catch (error) {

        console.error(
            "Lỗi sync:",
            error
        );
    }
}

window.addEventListener(
    "online",
    () => {

        console.log(
            "Internet đã trở lại"
        );

        syncPendingSurveys();
    }
);

window.addEventListener(
    "load",
    () => {

        console.log(
            "Trang đã load → kiểm tra đồng bộ"
        );

        syncPendingSurveys();
    }
);

window.syncPendingSurveys = syncPendingSurveys;
window.syncSurveys = syncPendingSurveys;
window.triggerSync = syncPendingSurveys;