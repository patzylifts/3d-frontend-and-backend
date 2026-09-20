# store/views_verification.py
import math
import re
import secrets

from django.db import transaction
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models_verification import (
    SMSVerification,
    MAX_OTP_ATTEMPTS,
)
from utils.sms import send_sms

RESEND_COOLDOWN_SECONDS = 60
OTP_EXPIRY_SECONDS = 300

PHONE_PATTERN = re.compile(
    r"^09\d{9}$"
)

def validate_phone(phone):
    if not phone:
        return None

    phone = str(phone).strip()

    if not PHONE_PATTERN.fullmatch(phone):
        return None

    return phone


@api_view(["POST"])
@permission_classes([AllowAny])
def send_verification_code(request):
    phone = validate_phone(
        request.data.get("phone")
    )

    if not phone:
        return Response(
            {
                "error":
                    "Enter a valid Philippine mobile number "
                    "using 09XXXXXXXXX."
            },
            status=400,
        )

    latest = (
        SMSVerification.objects
        .filter(
            phone=phone,
            is_verified=False,
        )
        .order_by("-created_at")
        .first()
    )

    if latest:
        seconds_since_sent = (
            timezone.now()
            - latest.created_at
        ).total_seconds()

        if (
            seconds_since_sent
            < RESEND_COOLDOWN_SECONDS
        ):
            retry_after = math.ceil(
                RESEND_COOLDOWN_SECONDS
                - seconds_since_sent
            )

            return Response(
                {
                    "error":
                        f"Please wait {retry_after} "
                        f"second(s) before requesting "
                        f"another OTP.",

                    "retry_after":
                        retry_after,
                },
                status=429,
            )

    verification = SMSVerification(
        phone=phone
    )

    verification.generate_code()
    verification.save()

    sms_response = send_sms(
        phone,
        (
            "Smiley Page Corner verification code: "
            f"{verification.code}. "
            "This code expires in 5 minutes."
        ),
    )

    if (
        not sms_response
        or
        sms_response.get("success")
        is not True
    ):
        verification.delete()

        return Response(
            {
                "error":
                    (
                        sms_response.get(
                            "error"
                        )
                        if sms_response
                        else
                        "SMS service unavailable."
                    )
            },
            status=503,
        )

    # The replacement OTP was successfully accepted
    # by the SMS provider.
    #
    # We can now invalidate every older OTP for this
    # phone number.
    SMSVerification.objects.filter(
        phone=phone
    ).exclude(
        id=verification.id
    ).delete()

    return Response(
        {
            "message":
                "Verification code sent.",

            "expires_in":
                OTP_EXPIRY_SECONDS,

            "resend_after":
                RESEND_COOLDOWN_SECONDS,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_code(request):
    phone = validate_phone(
        request.data.get("phone")
    )

    code = str(
        request.data.get("code", "")
    ).strip()

    if not phone:
        return Response(
            {
                "error":
                    "Enter a valid Philippine mobile number."
            },
            status=400,
        )

    if (
        not code.isdigit()
        or len(code) != 6
    ):
        return Response(
            {
                "error":
                    "OTP must contain exactly 6 digits."
            },
            status=400,
        )

    with transaction.atomic():
        verification = (
            SMSVerification.objects
            .select_for_update()
            .filter(
                phone=phone,
                is_verified=False,
            )
            .order_by("-created_at")
            .first()
        )

        if not verification:
            return Response(
                {
                    "error":
                        "No active OTP was found. "
                        "Please request a new code."
                },
                status=400,
            )

        if verification.is_expired():
            verification.delete()

            return Response(
                {
                    "error":
                        "OTP expired. "
                        "Please request a new code."
                },
                status=400,
            )

        if (
            verification.failed_attempts
            >= MAX_OTP_ATTEMPTS
        ):
            return Response(
                {
                    "error":
                        "Too many incorrect attempts. "
                        "Please request a new OTP."
                },
                status=429,
            )

        if not secrets.compare_digest(
            verification.code,
            code,
        ):
            verification.failed_attempts += 1

            verification.save(
                update_fields=[
                    "failed_attempts",
                ]
            )

            attempts_remaining = max(
                MAX_OTP_ATTEMPTS
                - verification.failed_attempts,
                0,
            )

            if attempts_remaining == 0:
                return Response(
                    {
                        "error":
                            "Too many incorrect attempts. "
                            "Please request a new OTP."
                    },
                    status=429,
                )

            return Response(
                {
                    "error":
                        "Invalid OTP.",

                    "attempts_remaining":
                        attempts_remaining,
                },
                status=400,
            )

        verification.is_verified = True
        verification.verified_at = (
            timezone.now()
        )

        verification.save(
            update_fields=[
                "is_verified",
                "verified_at",
            ]
        )

        SMSVerification.objects.filter(
            phone=phone
        ).exclude(
            id=verification.id
        ).delete()

    return Response(
        {
            "message":
                "Phone verified."
        }
    )