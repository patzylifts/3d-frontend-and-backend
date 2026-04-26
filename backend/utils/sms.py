# utils/sms.py
import requests
import os

SMS_API_URL = "https://smsapiph.onrender.com/api/v1/send/sms"
SMS_API_KEY = os.getenv("SMS_API_KEY")


def normalize_phone(phone):
    if phone.startswith("09"):
        return "+63" + phone[1:]
    return phone


def send_sms(phone, message):
    phone = normalize_phone(phone)  # 🔥 APPLY IT HERE

    headers = {
        "x-api-key": SMS_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "recipient": phone,
        "message": message
    }

    try:
        res = requests.post(SMS_API_URL, json=payload, headers=headers)
        print("SMS RESPONSE:", res.text)
        return res.json()

    except Exception as e:
        print("SMS error:", e)
        return None