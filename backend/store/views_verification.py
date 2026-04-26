# store/views_verification.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models_verification import SMSVerification
from utils.sms import send_sms

@api_view(['POST'])
@permission_classes([AllowAny])
def send_verification_code(request):
    phone = request.data.get("phone")

    if not phone:
        return Response({"error": "Phone is required"}, status=400)

    verification = SMSVerification.objects.create(
        phone=phone
    )

    verification.generate_code()
    verification.save()

    send_sms(phone, f"Your verification code is {verification.code}")

    return Response({"message": "Verification code sent"})

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_code(request):
    phone = request.data.get("phone")
    code = request.data.get("code")

    try:
        verification = SMSVerification.objects.filter(
            phone=phone,
            code=code,
            is_verified=False
        ).latest("created_at")

        verification.is_verified = True
        verification.save()

        return Response({"message": "Phone verified"})

    except SMSVerification.DoesNotExist:
        return Response({"error": "Invalid code"}, status=400)