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
def admin_update_order(request, order_id):
    try:
        order = Order.objects.get(id=order_id)

        status = request.data.get('status')
        payment_status = request.data.get('payment_status')

        if status:
            order.status = status

        if payment_status:
            order.payment_status = payment_status

        order.save()

        serializer = OrderSerializer(order)
        return Response({
            'message': 'Order updated successfully',
            'order': serializer.data
        })

    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)
