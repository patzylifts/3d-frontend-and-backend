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
from store.models import Order
from .models import Payment

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
        if amount < float(order.total_amount):
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
    
@csrf_exempt
def paymongo_webhook(request):
    if request.method != "POST":
        return JsonResponse({"message": "Method not allowed"}, status=405)

    try:
        try:
            payload = request.body.decode("utf-8")
            data = json.loads(payload)
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        print("🔥 Webhook hit!")
        print(json.dumps(data, indent=2))

        event_type = data.get("data", {}).get("attributes", {}).get("type")

        if event_type != "checkout_session.payment.paid":
            print("⚠️ Ignored:", event_type)
            return JsonResponse({"message": "Ignored"}, status=200)

        # ✅ FIXED ID EXTRACTION
        checkout_id = (
            data.get("data", {})
                .get("attributes", {})
                .get("data", {})
                .get("id")
        )

        if not checkout_id:
            print("❌ No checkout ID")
            return JsonResponse({"error": "No checkout ID"}, status=400)

        print("✅ Checkout ID:", checkout_id)

        payment = Payment.objects.filter(transaction_id=checkout_id).first()

        if not payment:
            print("❌ Payment not found for:", checkout_id)
            return JsonResponse({"error": "Payment not found"}, status=404)

        order = payment.order

        # ✅ prevent double execution
        if payment.status == "paid":
            print("⚠️ Already processed")
            return JsonResponse({"message": "Already processed"}, status=200)

        # 🔥 logic
        if payment.amount < float(order.total_amount):
            payment.status = "partial"
            order.payment_status = "partial"
        else:
            payment.status = "paid"
            order.payment_status = "paid"

        order.status = "processing"

        payment.save()
        order.save()

        print(f"✅ Payment {payment.id} updated via webhook")

        return JsonResponse({"message": "Success"}, status=200)

    except Exception as e:
        print("💥 Webhook error:", str(e))
        return JsonResponse({"error": str(e)}, status=500)