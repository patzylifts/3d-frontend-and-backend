# store/views_verification.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models_verification import SMSVerification
from utils.sms import send_sms

@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_code(request):

    phone = request.data.get("phone")

    if not phone:
        return Response({
            "error": "Phone is required"
        }, status=400)

    # Optional anti-spam cleanup
    SMSVerification.objects.filter(
        phone=phone,
        is_verified=False
    ).delete()

    verification = SMSVerification.objects.create(
        phone=phone
    )

    verification.generate_code()
    verification.save()

    sms_response = send_sms(
        phone,
        f"Your Cake Shop verification code is {verification.code}. Valid for 5 minutes."
    )

    if not sms_response:
        return Response({
            "error": "SMS service unavailable"
        }, status=500)

    if sms_response.get("success") is False:
        return Response({
            "error": sms_response.get("error", "Failed to send OTP")
        }, status=400)

    return Response({
        "message": "Verification code sent"
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_code(request):

    phone = request.data.get("phone")
    code = request.data.get("code")

    if not phone or not code:
        return Response({
            "error": "Phone and code are required"
        }, status=400)

    try:
        verification = SMSVerification.objects.filter(
            phone=phone,
            code=code,
            is_verified=False
        ).latest("created_at")

    except SMSVerification.DoesNotExist:
        return Response({
            "error": "Invalid OTP"
        }, status=400)

    if verification.is_expired():
        verification.delete()

        return Response({
            "error": "OTP expired"
        }, status=400)

    verification.is_verified = True
    verification.save()

    return Response({
        "message": "Phone verified"
    })