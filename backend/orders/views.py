import uuid

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from store.models import Order
from .serializers import OrderSerializer

# CUSTOMER: ORDER HISTORY
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_history(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


# CUSTOMER: ORDER DETAIL
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_orders(request):
    user = request.user
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)

import uuid
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_order(request, order_id):
    import requests
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        if order.status != "awaiting_downpayment":
            return Response({"error": "Order is not ready for payment"}, status=400)

        # get amount from request
        amount = request.data.get("amount")
        if not amount:
            return Response({"error": "Amount is required"}, status=400)

        amount = float(amount)
        min_amount = float(order.total_amount) * 0.2
        if amount < min_amount or amount > float(order.total_amount):
            return Response({"error": "Amount must be between 20% and 100% of total"}, status=400)

        # Create PayMongo payment intent (sandbox)
        # sandbox secret key
        PAYMONGO_SECRET = "sk_test_your_sandbox_key_here"
        headers = {"Authorization": f"Basic {PAYMONGO_SECRET}", "Content-Type": "application/json"}
        payload = {
            "data": {
                "attributes": {
                    "amount": int(amount * 100),  # PayMongo uses cents
                    "currency": "PHP",
                    "description": f"Order {order.id} Downpayment",
                    "payment_method_allowed": ["gcash"],
                    "redirect": {"success": f"http://localhost:5173/orders/{order.id}/checkout", 
                                 "failed": f"http://localhost:5173/orders/{order.id}"}
                }
            }
        }
        resp = requests.post("https://api.paymongo.com/v1/payment_intents", json=payload, headers=headers)
        return Response(resp.json())

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)

# CONFIRM PAYMENT (simulate success)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)

        if order.payment_status == "paid":
            return Response({"message": "Already paid"})

        order.payment_status = "paid"
        order.status = "processing"
        order.save()

        return Response({
            "message": "Payment confirmed",
            "status": order.status,
            "payment_status": order.payment_status
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)