# utils/sms.py
import requests
import os

SMS_API_URL = "https://fortmed.org/web/FMCSMS/api/messages.php"
SMS_API_KEY = os.getenv("SMS_API_KEY")

def normalize_phone(phone):

    if phone.startswith("09"):
        return "+63" + phone[1:]

    return phone

def send_sms(phone, message):

    phone = normalize_phone(phone)

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": SMS_API_KEY,
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
    }

    payload = {
        "SenderName": "Cake Shop",
        "ToNumber": phone,
        "MessageBody": message,
        "FromNumber": "+639000000000"
    }

    try:

        response = requests.post(
            SMS_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        print("SMS STATUS:", response.status_code)
        print("SMS RESPONSE:", response.text)

        return response.json()

    except Exception as e:

        print("SMS ERROR:", str(e))

        return {
            "success": False,
            "error": str(e)
        }
       
# dev mode (no sms credit)
# def send_sms(phone, message):

#     print("===== DEV SMS MODE =====")
#     print("PHONE:", phone)
#     print("MESSAGE:", message)

#     return {
#         "success": True,
#         "dev_mode": True
#     }