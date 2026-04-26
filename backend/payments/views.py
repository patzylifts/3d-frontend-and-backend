# payments/views.py
import hmac
import hashlib
import json
import requests
import base64
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import PaymentSerializer
from .models import Payment
from store.models import Order
from decimal import Decimal

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.status in ["pending_review", "cancelled", "rejected", "completed"]:
            return Response({"error": "Order not ready for payment"}, status=400)

        amount = request.data.get("amount")
        tip = request.data.get("tip", 0)

        if amount is None:
            return Response({"error": "Amount is required"}, status=400)

        amount = Decimal(str(amount))
        tip = Decimal(str(tip))

        total_paid = sum(p.amount for p in order.payments.filter(status__in=["partial", "paid"]))

        total_amount = order.total_amount  # already Decimal

        remaining_balance = total_amount - total_paid

        # FIRST PAYMENT → enforce 20%
        if total_paid == 0:
            min_amount = order.total_amount * Decimal("0.2")
            if amount < min_amount:
                return Response({"error": "Minimum is 20% of total"}, status=400)

        if amount > remaining_balance:
            return Response({"error": "Amount exceeds remaining balance"}, status=400)

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
    
@csrf_exempt
def paymongo_webhook(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    try:
        payload = request.body
        sig_header = request.headers.get("Paymongo-Signature", "")
        secret = settings.PAYMONGO_WEBHOOK_SECRET.encode()

        # Essential debug
        print("🔥 Webhook hit!")
        print(f"Signature header: {sig_header}")

        # Parse header
        try:
            sig_parts = dict(part.split("=") for part in sig_header.split(","))
            timestamp = sig_parts.get("t", "")
            received_sig = sig_parts.get("v1") or sig_parts.get("te")
        except Exception as ex:
            print("❌ Invalid signature header format:", str(ex))
            return JsonResponse({"error": "Invalid signature header"}, status=400)

        # Compute expected HMAC
        signed_payload = f"{timestamp}.{payload.decode('utf-8')}".encode()
        expected_sig = hmac.new(secret, signed_payload, hashlib.sha256).hexdigest()

        # Signature debug
        print(f"Timestamp: {timestamp}")
        print(f"Received signature: {received_sig}")
        print(f"Expected signature: {expected_sig}")

        if not hmac.compare_digest(received_sig, expected_sig):
            print("❌ Signature mismatch! Possible fraud attempt.")
            return JsonResponse({"error": "Invalid signature"}, status=400)

        # JSON parsing
        data = json.loads(payload)

        # Only handle payment.paid events
        event_type = data.get("data", {}).get("attributes", {}).get("type")
        if event_type != "checkout_session.payment.paid":
            return JsonResponse({"message": "Ignored"}, status=200)

        checkout_id = data.get("data", {}).get("attributes", {}).get("data", {}).get("id")
        if not checkout_id:
            return JsonResponse({"error": "No checkout ID"}, status=400)

        payment = Payment.objects.filter(transaction_id=checkout_id).first()
        if not payment:
            return JsonResponse({"error": "Payment not found"}, status=404)

        order = payment.order

        if payment.status != "paid":
            # Sum up previously successful payments
            previous_paid = sum(p.amount for p in order.payments.filter(status__in=["partial", "paid"]))
            
            # 🔥 TOTAL PAID INCLUDING THIS PAYMENT
            total_paid = previous_paid + payment.amount

            total_amount = Decimal(str(order.total_amount))

            if total_paid < total_amount:
                payment.status = "partial"
                order.payment_status = "partial"
            else:
                payment.status = "paid"
                order.payment_status = "paid"

            if order.status == "awaiting_downpayment":
                order.status = "processing"

            payment.save()
            order.save()

            print(f"✅ Payment {payment.id} updated successfully via webhook")
        else:
            print(f"⚠️ Payment {payment.id} already processed")

        return JsonResponse({"message": "Success"}, status=200)

    except Exception as e:
        print("💥 Webhook error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)