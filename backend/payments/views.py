# payments/views.py
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from store.models import Order
from .serializers import PaymentSerializer
from .models import Payment

import requests
import base64

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.status != "awaiting_downpayment":
            return Response({"error": "Order not ready for payment"}, status=400)

        amount = request.data.get("amount")
        tip = request.data.get("tip", 0)

        if amount is None:
            return Response({"error": "Amount is required"}, status=400)

        amount = float(amount)
        tip = float(tip)

        min_amount = float(order.total_amount) * 0.2
        if amount < min_amount:
            return Response({"error": "Minimum is 20% of total"}, status=400)

        # ✅ Record payment attempt in backend
        payment = Payment.objects.create(
            order=order,
            user=request.user,
            amount=amount,
            tip=tip,
            status="pending"
        )

        # 🔐 Encode PayMongo key
        encoded_key = base64.b64encode(f"{settings.PAYMONGO_SECRET_KEY}:".encode()).decode()
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
                            "amount": int((amount + tip) * 100),
                            "currency": "PHP",
                            "quantity": 1
                        }
                    ],
                    "payment_method_types": ["gcash"],
                    "success_url": f"http://localhost:5173/orders/{order.id}?payment=success",
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

        # 🔑 Save PayMongo transaction ID
        payment.transaction_id = data["data"]["id"]
        payment.save()

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

        # get last payment attempted
        last_payment = order.payments.last()
        if not last_payment:
            return Response({"error": "No payment found for this order"}, status=400)

        if last_payment.status == "paid":
            return Response({"message": "Already paid"})

        # Confirm payment
        amount = float(request.data.get("amount", 0))
        tip = float(request.data.get("tip", 0))

        # 🔥 BUSINESS LOGIC
        if amount + tip < float(order.total_amount):
            last_payment.status = "partial"
            order.payment_status = "partial"
        else:
            last_payment.status = "paid"
            order.payment_status = "paid"

        # Always update order status
        order.status = "processing"
        order.save()
        last_payment.save()

        return Response({
            "message": "Payment confirmed",
            "status": order.status,
            "payment_status": order.payment_status
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)