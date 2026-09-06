# orders/views.py
from django.db import transaction
from django.utils import timezone
from chat.models import Conversation, Message
from .serializers import QuotationSerializer
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from store.models import Order
from .models import OrderFeedback
from .serializers import OrderSerializer
from .serializers_feedback import OrderFeedbackSerializer
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
        order = Order.objects.get(id=order_id)

    except Order.DoesNotExist:
        return Response(
            {
                "error": "Order does not exist",
                "order_id": order_id,
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if order.user_id != request.user.id:
        return Response(
            {
                "error": "You do not have access to this order",
                "order_id": order_id,
            },
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = OrderSerializer(order)

    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_quotation(request, order_id):

    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    if not order.is_uploaded_cake:
        return Response(
            {"error": "Quotation acceptance is only available for uploaded cake orders."},
            status=400
        )

    if order.status != "awaiting_customer_response":
        return Response(
            {"error": "This order is not waiting for quotation acceptance."},
            status=400
        )

    quotation = order.quotations.filter(
        status="pending"
    ).order_by("-created_at").first()

    if not quotation:
        return Response(
            {"error": "No active quotation found for this order."},
            status=400
        )

    with transaction.atomic():

        quotation.status = "accepted"
        quotation.accepted_at = timezone.now()
        quotation.save(
            update_fields=[
                "status",
                "accepted_at",
            ]
        )

        order.quotations.filter(
            status="pending"
        ).exclude(
            id=quotation.id
        ).update(
            status="replaced"
        )

        order.quoted_price = quotation.amount
        order.total_amount = quotation.amount
        order.status = "awaiting_downpayment"

        order_item = order.items.filter(
            customization__uploaded_cake=True
        ).first()

        if order_item:
            order_item.price = quotation.amount
            order_item.save(
                update_fields=["price"]
            )

        order.save(
            update_fields=[
                "quoted_price",
                "total_amount",
                "status",
            ]
        )

        conversation, _ = Conversation.objects.get_or_create(
            order=order
        )

        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            sender_type="customer",
            message_type="system",
            content=f"Quotation accepted: ₱{quotation.amount:,.2f}",
            metadata={
                "quotation_id": quotation.id,
                "amount": str(quotation.amount),
                "status": "accepted",
                "is_quotation_acceptance": True,
            },
        )

    return Response({
        "message": "Quotation accepted successfully.",
        "quotation": QuotationSerializer(quotation).data,
        "order": OrderSerializer(order).data,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        total_paid = sum(p.amount for p in order.payments.all())
        
        if order.status == "awaiting_customer_response":
            order.status = "cancelled"
            order.payment_status = "cancelled"
            order.save()
            send_order_status_sms(order)
            return Response({"message": "Order cancelled successfully"})

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
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request, order_id):

    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    if order.status != "delivered":
        return Response(
            {"error": "You can only review delivered orders"},
            status=400
        )

    if hasattr(order, "feedback"):
        return Response(
            {"error": "Feedback already submitted"},
            status=400
        )

    serializer = OrderFeedbackSerializer(data=request.data)

    if serializer.is_valid():

        serializer.save(
            order=order,
            user=request.user
        )

        return Response({
            "message": "Feedback submitted successfully",
            "feedback": serializer.data
        })

    return Response(serializer.errors, status=400)