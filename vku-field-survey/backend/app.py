from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

CORS(app)


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

    print("NHẬN PHIẾU KHẢO SÁT:", data)

    # TODO: Gọi hàm ghi vào Google Sheet tại đây (append_row)

    # BẮT BUỘC: Trả lại survey_id hoặc id để sync.js biết bản ghi nào đã xong
    return jsonify({
        "success": True,
        "message": "Đã nhận phiếu khảo sát",
        "id": data.get("id"),
        "server_time": datetime.now().isoformat()
    }), 200


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