# orders/serializers.py
from rest_framework import serializers
from store.models import Order, OrderItem, Product

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'price', 'customization', 'subtotal']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_name', 'created_at', 'full_name', 'phone', 'street', 'city', 'province', 'postal_code', 'delivery_date', 'delivery_time', 'order_notes', 'total_amount', 'status', 'payment_status', 'total_paid', 'remaining_balance', 'items', 'rejection_reason',
        ]
        
    def get_total_paid(self, obj):
        return sum(
            p.amount + p.tip
            for p in obj.payments.filter(status__in=["partial", "paid"])
        )
        
    def get_remaining_balance(self, obj):
        total_paid = sum(p.amount + p.tip for p in obj.payments.all())
        return max(0, obj.total_amount - total_paid)

class CustomerOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "user", "user_name", "status", "payment_status", "total_amount", "created_at", "items"]