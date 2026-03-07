from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from store.models import Cart, CartItem, Order, OrderItem, Product
from .serializers import OrderSerializer, OrderItemSerializer

# PLACE ORDER (customer checkout)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_order(request):
    try:
        cart, created = Cart.objects.get_or_create(user=request.user)
        if not cart.items.exists():
            return Response({'error': 'Cart is empty'}, status=400)
        
        total = sum([item.subtotal for item in cart.items.all()])
        order = Order.objects.create(user=request.user, total_amount=total)
        
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
                customization={}  # placeholder for 3D cake customization
            )
        
        # Clear cart after order
        cart.items.all().delete()
        
        serializer = OrderSerializer(order)
        return Response({'message': 'Order placed successfully', 'order': serializer.data})
    
    except Exception as e:
        return Response({'error': str(e)}, status=500)


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


# ADMIN PLACEHOLDER: UPDATE ORDER STATUS
@api_view(['POST'])
@permission_classes([IsAdminUser])
def update_order_status(request, order_id):
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
        return Response({'message': 'Order updated successfully', 'order': serializer.data})
    
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)