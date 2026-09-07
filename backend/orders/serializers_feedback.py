# orders/serializers_feedback.py
from rest_framework import serializers
from .models import ProductReview
        
class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(
        source="user.username",
        read_only=True
    )

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "order_item",
            "product",
            "product_name",
            "user",
            "user_name",
            "rating",
            "comment",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "order_item",
            "product",
            "product_name",
            "user",
            "user_name",
            "created_at",
        ]