from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

from sheets import append_survey

app = Flask(__name__)

CORS(app)

# ID của Google Spreadsheet
SPREADSHEET_ID = "13IEqHmIw7tbOCHgqfF_m0sYbBPWoGJr_4PUH4dPXpgA"


@app.route("/")
def home():

    return jsonify({
        "message": "VKU Field Survey API",
        "status": "running"
    })


@app.route("/api/health")
def health():

    return jsonify({
        "status": "ok",
        "time": datetime.now().isoformat()
    })


@app.route("/api/survey", methods=["POST"])
def receive_survey():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Không có dữ liệu"
        }), 400

    print("===================================")
    print("NHẬN PHIẾU KHẢO SÁT")
    print("===================================")
    print(data)

    try:

        # Ghi dữ liệu vào Google Sheets
        result = append_survey(
            SPREADSHEET_ID,
            data
        )

        print("===================================")
        print("✓ ĐÃ GHI GOOGLE SHEETS")
        print("===================================")

        return jsonify({
            "success": True,
            "message": "Đã lưu Google Sheets",
            "id": data.get("id"),
            "updatedRange": result.get(
                "updates", {}
            ).get("updatedRange"),
            "server_time": datetime.now().isoformat()
        }), 200

    except Exception as error:

        print("===================================")
        print("❌ GOOGLE SHEETS ERROR")
        print("===================================")
        print(error)

        return jsonify({
            "success": False,
            "message": "Không thể ghi Google Sheets",
            "error": str(error)
        }), 500


if __name__ == "__main__":

    print("===================================")
    print("     VKU FIELD SURVEY BACKEND")
    print("===================================")
    print("Server starting...")
    print("URL: http://127.0.0.1:5000")
    print("===================================")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )