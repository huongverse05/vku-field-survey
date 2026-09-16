if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        async () => {

            try {

                await navigator.serviceWorker.register(
                    "./service-worker.js"
                );

                console.log(
                    "Service Worker registered"
                );

            } catch (error) {

                console.error(
                    "Service Worker error:",
                    error
                );

            }

        }
    );

}


function updateNetworkStatus() {

    const element =
        document.getElementById(
            "networkStatus"
        );

    if (!element) return;


    if (navigator.onLine) {

        element.textContent =
            "🟢 Đang online";

    } else {

        element.textContent =
            "🔴 Đang offline";

    }

}


window.addEventListener("online", () => {
    updateNetworkStatus();
    // Gọi hàm sync từ sync.js (đảm bảo sync.js có hàm này)
    if (typeof syncOfflineSurveys === "function") {
        syncOfflineSurveys();
    } else if (typeof triggerSync === "function") {
        triggerSync();
    }
});


window.addEventListener(
    "offline",
    updateNetworkStatus
);


updateNetworkStatus();