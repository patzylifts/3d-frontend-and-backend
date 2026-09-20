# utils/sms.py
import re
import requests

from django.conf import settings

def normalize_phone(phone):
    if not phone:
        raise ValueError("Phone number is required.")

    digits = re.sub(r"\D", "", str(phone))

    if len(digits) == 11 and digits.startswith("09"):
        return "63" + digits[1:]

    if len(digits) == 12 and digits.startswith("63"):
        return digits

    if len(digits) == 10 and digits.startswith("9"):
        return "63" + digits

    raise ValueError(
        "Invalid Philippine mobile number."
    )


def send_sms(phone, message):
    try:
        recipient = normalize_phone(phone)

    except ValueError as exc:
        return {
            "success": False,
            "error": str(exc),
        }
        
    if settings.SMS_DEBUG:
        print("\n" + "=" * 60)
        print("SMS DEBUG MODE - NO REAL SMS SENT")
        print("TO:", recipient)
        print("MESSAGE:", message)
        print("=" * 60 + "\n")

        return {
            "success": True,
            "provider": "debug",
            "debug": True,
            "recipient": recipient,
        }

    if not settings.PHILSMS_API_TOKEN:
        return {
            "success": False,
            "error": "PhilSMS API token is not configured.",
        }

    headers = {
        "Authorization": f"Bearer {settings.PHILSMS_API_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "recipient": recipient,
        "sender_id": settings.PHILSMS_SENDER_ID,
        "type": "plain",
        "message": str(message),
    }

    try:
        response = requests.post(
            settings.PHILSMS_API_URL,
            headers=headers,
            json=payload,
            timeout=20,
        )

    except requests.RequestException as exc:
        print(
            "PHILSMS CONNECTION ERROR:",
            str(exc),
        )

        return {
            "success": False,
            "provider": "philsms",
            "error": "Unable to connect to PhilSMS.",
        }

    try:
        response_data = response.json()

    except ValueError:
        response_data = {}

    print(
        "PHILSMS STATUS:",
        response.status_code,
    )

    print(
        "PHILSMS RESPONSE:",
        response_data,
    )

    provider_status = response_data.get(
        "status"
    )

    if response.ok and provider_status == "success":
        sent_data = response_data.get("data") or {}

        return {
            "success": True,
            "provider": "philsms",
            "uid": sent_data.get("uid"),
            "data": sent_data,
        }

    error_message = (
        response_data.get("message")
        or
        f"PhilSMS returned HTTP {response.status_code}."
    )

    return {
        "success": False,
        "provider": "philsms",
        "error": error_message,
        "status_code": response.status_code,
        "data": response_data.get("data"),
    }