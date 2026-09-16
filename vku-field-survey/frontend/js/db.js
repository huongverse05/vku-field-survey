const DB_NAME = "VKUFieldSurveyDB";
const DB_VERSION = 1;
const STORE_NAME = "surveys";

function openDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {

                const store =
                    db.createObjectStore(
                        STORE_NAME,
                        { keyPath: "id" }
                    );

                store.createIndex(
                    "status",
                    "status",
                    { unique: false }
                );
            }
        };

        request.onsuccess = function(event) {

            console.log("✓ IndexedDB đã mở");

            resolve(event.target.result);
        };

        request.onerror = function(event) {

            console.error(
                "❌ IndexedDB error:",
                event.target.error
            );

            reject(event.target.error);
        };
    });
}


async function saveSurvey(survey) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.put(survey);

        request.onsuccess = function() {

            console.log("✓ saveSurvey thành công");

            resolve(survey);
        };

        request.onerror = function(event) {

            console.error(
                "saveSurvey error:",
                event.target.error
            );

            reject(event.target.error);
        };
    });
}


async function getAllSurveys() {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readonly"
            );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.getAll();

        request.onsuccess = function() {

            resolve(request.result);
        };

        request.onerror = function(event) {

            reject(event.target.error);
        };
    });
}


async function deleteSurvey(id) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        const store =
            transaction.objectStore(STORE_NAME);

        const request =
            store.delete(id);

        request.onsuccess = function() {

            resolve();
        };

        request.onerror = function(event) {

            reject(event.target.error);
        };
    });
}