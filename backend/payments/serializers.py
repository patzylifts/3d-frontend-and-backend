from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "amount",
            "tip",
            "status",
            "paymongo_payment_id",
            "processed_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields