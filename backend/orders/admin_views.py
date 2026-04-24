# orders/admin_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from store.models import Order
from .serializers import OrderSerializer
from django.db.models import Count, Sum
from datetime import date

# ADMIN: LIST ALL ORDERS
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_orders(request):
    orders = Order.objects.all().order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


# ADMIN: ORDER DETAIL
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)


# ADMIN: UPDATE ORDER
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_review_order(request, order_id):
    try:
        order = Order.objects.get(id=order_id)

        # 🚫 Only allow review if still pending
        if order.status != "pending_review":
            return Response({"error": "Order already reviewed"}, status=400)

        new_status = request.data.get("status")
        reason = request.data.get("rejection_reason")

        # 🚫 Restrict allowed transitions
        if new_status not in ["awaiting_downpayment", "rejected"]:
            return Response({"error": "Invalid status"}, status=400)

        if new_status == "rejected":
            if not reason:
                return Response({"error": "Rejection reason required"}, status=400)
            order.rejection_reason = reason

        order.status = new_status
        order.save()

        return Response({
            "message": "Order reviewed successfully",
            "order": OrderSerializer(order).data
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)
    
@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_update_order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)

        new_status = request.data.get("status")

        if not new_status:
            return Response({"error": "Status is required"}, status=400)

        valid_transitions = {
            "awaiting_downpayment": ["processing", "cancelled"],
            "processing": ["ready_for_delivery", "cancelled"],
            "ready_for_delivery": ["out_for_delivery"],
            "out_for_delivery": ["delivered"],
            "delivered": ["completed"],
        }

        current = order.status

        if current not in valid_transitions or new_status not in valid_transitions[current]:
            return Response({"error": f"Invalid transition from {current} to {new_status}"}, status=400)

        order.status = new_status

        # auto update payment status if delivered (cash on delivery logic)
        if new_status == "delivered":
            order.payment_status = "paid"

        order.save()

        return Response({
            "message": "Order status updated",
            "order": OrderSerializer(order).data,

            # 🔥 PLACEHOLDER FLAGS
            "trigger_sms": True if new_status in ["ready_for_delivery", "out_for_delivery", "delivered"] else False,
            "allow_rating": True if new_status == "delivered" else False
        })

    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)
    
# DASHBOARD
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_dashboard(request):
    orders = Order.objects.all()

    data = {
        "total_orders": orders.count(),
        "pending_review": orders.filter(status="pending_review").count(),
        "awaiting_downpayment": orders.filter(status="awaiting_downpayment").count(),
        "completed": orders.filter(status="completed").count(),

        # optional but useful
        "total_revenue": orders.filter(payment_status="paid").aggregate(
            total=Sum("total_amount")
        )["total"] or 0,
    }

    return Response(data)