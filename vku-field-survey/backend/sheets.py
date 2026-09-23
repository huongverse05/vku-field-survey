import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]

# Tự động lấy đường dẫn tuyệt đối tới thư mục backend/credentials
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_FILE = os.path.join(CURRENT_DIR, "credentials", "service-account.json")


def get_sheets_service():
    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES
    )

    service = build(
        "sheets",
        "v4",
        credentials=credentials
    )

    return service


def append_survey(spreadsheet_id, survey):
    service = get_sheets_service()

    values = [[
        str(survey.get("id", "")),
        str(survey.get("createdAt", "")),
        str(survey.get("investigator", "")),
        str(survey.get("location", "")),
        str(survey.get("facilityType", "")),
        str(survey.get("quality", "")),
        str(survey.get("rating", "")),
        str(survey.get("comment", "")),
        str(survey.get("status", "synced")),
        str(survey.get("syncedAt", ""))
    ]]

    body = {
        "values": values
    }

    # Lưu ý: Đổi "Surveys!A:J" nếu tên tab trong Google Sheets của bạn là tên khác (vd: Sheet1!A:J)
    result = (
        service
        .spreadsheets()
        .values()
        .append(
            spreadsheetId=spreadsheet_id,
            range="Surveys!A:J",
            valueInputOption="USER_ENTERED",  # Đổi sang USER_ENTERED để tự định dạng ngày giờ, số
            insertDataOption="INSERT_ROWS",
            body=body
        )
        .execute()
    )

    return result