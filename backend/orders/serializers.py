# orders/serializers.py
from rest_framework import serializers
from payments.serializers import PaymentSerializer
from store.models import Order, OrderItem, Product

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_price', 'quantity', 'price', 'customization', 'subtotal']

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
    
        if obj.customization:
            shape = obj.customization.get("shape", "")
            flavor = obj.customization.get("flavor", "")
            return f"Custom {shape} {flavor} Cake"
    
        return "Custom Cake"

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    customer_email = serializers.CharField(source='user.email', read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    full_address = serializers.SerializerMethodField()
    formatted_phone = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_name', 'customer_email', 'created_at', 'full_name', 'phone', 'formatted_phone', 'street', 'city', 'province', 'postal_code', 'full_address', 'delivery_date', 'delivery_time', 'order_notes', 'total_amount', 'status', 'payment_status', 'total_paid', 'remaining_balance', 'items', 'rejection_reason', 'payments',
        ]
        
    def get_total_paid(self, obj):
        return sum(
            p.amount
            for p in obj.payments.filter(status__in=["partial", "paid"])
        )
        
    def get_remaining_balance(self, obj):
        total_paid = sum(
            p.amount
            for p in obj.payments.filter(status__in=["partial", "paid"])
        )
        return max(0, obj.total_amount - total_paid)
    
    def get_full_address(self, obj):
        """Combines address components into a single formatted string"""
        address_parts = []
        if obj.street:
            address_parts.append(obj.street)
        if obj.city:
            address_parts.append(obj.city)
        if obj.province:
            address_parts.append(obj.province)
        if obj.postal_code:
            address_parts.append(obj.postal_code)
        
        return ", ".join(address_parts) if address_parts else "No address provided"
    
    def get_formatted_phone(self, obj):
        """Formats phone number nicely (e.g., 09123456789 -> 0912-345-6789)"""
        if not obj.phone:
            return "No phone provided"
        
        phone = str(obj.phone)
        if len(phone) == 11 and phone.startswith('09'):
            # Format: 0912-345-6789
            return f"{phone[:4]}-{phone[4:7]}-{phone[7:]}"
        return phone

class CustomerOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "user", "user_name", "status", "payment_status", "total_amount", "created_at", "items"]