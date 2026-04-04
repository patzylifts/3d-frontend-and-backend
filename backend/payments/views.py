import requests
import base64

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from store.models import Order


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.status != "awaiting_downpayment":
            return Response({"error": "Order not ready for payment"}, status=400)

        # ✅ GET VALUES FROM FRONTEND
        amount = request.data.get("amount")
        tip = request.data.get("tip", 0)

        if amount is None:
            return Response({"error": "Amount is required"}, status=400)

        amount = float(amount)
        tip = float(tip)

        min_amount = float(order.total_amount) * 0.2

        # ✅ VALIDATE ONLY BASE PAYMENT
        if amount < min_amount:
            return Response({"error": "Minimum is 20% of total"}, status=400)

        # ✅ FINAL CHARGE (PAYMENT + TIP)
        total_charge = amount + tip

        # 🔐 Encode secret key from .env
        encoded_key = base64.b64encode(
            f"{settings.PAYMONGO_SECRET_KEY}:".encode()
        ).decode()

        headers = {
            "Authorization": f"Basic {encoded_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "data": {
                "attributes": {
                    "line_items": [
                        {
                            "name": f"Order #{order.id}",
                            "amount": int(total_charge * 100),
                            "currency": "PHP",
                            "quantity": 1
                        }
                    ],
                    "payment_method_types": ["gcash"],
                    "success_url": f"http://localhost:5173/orders/{order.id}/checkout",
                    "cancel_url": f"http://localhost:5173/orders/{order.id}"
                }
            }
        }

        response = requests.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            json=payload,
            headers=headers
        )

        data = response.json()

        return Response({
            "checkout_url": data["data"]["attributes"]["checkout_url"]
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.payment_status == "paid":
            return Response({"message": "Already paid"})

        # get last payment from frontend (stored earlier)
        amount = request.data.get("amount")

        if amount is None:
            return Response({"error": "Amount required"}, status=400)

        amount = float(amount)

        # 🔥 BUSINESS LOGIC
        if amount < float(order.total_amount):
            order.payment_status = "partial"
        else:
            order.payment_status = "paid"

        # ✅ ALWAYS PROCESSING AFTER ANY PAYMENT
        order.status = "processing"

        order.save()

        return Response({
            "message": "Payment confirmed",
            "status": order.status,
            "payment_status": order.payment_status
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)