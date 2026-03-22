from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from store.models import Order
from .serializers import OrderSerializer


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