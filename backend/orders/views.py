# orders/views.py
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from store.models import Order
from .serializers import OrderSerializer
from orders.utils_sms_notifications import send_order_status_sms

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_history(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        total_paid = sum(p.amount for p in order.payments.all())

        if order.status == "pending_review":
            order.status = "cancelled"
            order.payment_status = "cancelled"
            order.save()
            send_order_status_sms(order)
            return Response({"message": "Order cancelled successfully"})

        if order.status == "awaiting_downpayment" and total_paid == 0:
            order.status = "cancelled"
            order.payment_status = "cancelled"
            order.save()
            send_order_status_sms(order)
            return Response({"message": "Order cancelled successfully"})

        return Response(
            {"error": "This order can no longer be cancelled"},
            status=400
        )

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)