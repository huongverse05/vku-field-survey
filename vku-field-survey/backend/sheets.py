from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets"
]

SERVICE_ACCOUNT_FILE = "credentials/service-account.json"


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
        survey.get("id", ""),
        survey.get("createdAt", ""),
        survey.get("investigator", ""),
        survey.get("location", ""),
        survey.get("facilityType", ""),
        survey.get("quality", ""),
        survey.get("rating", ""),
        survey.get("comment", ""),
        survey.get("status", "synced"),
        survey.get("syncedAt", "")
    ]]

    body = {
        "values": values
    }

    result = (
        service
        .spreadsheets()
        .values()
        .append(
            spreadsheetId=spreadsheet_id,
            range="Surveys!A:J",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body=body
        )
        .execute()
    )

    return result