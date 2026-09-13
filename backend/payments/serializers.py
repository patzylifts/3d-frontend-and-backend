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
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields