# orders/serializers_feedback.py
from rest_framework import serializers
from .models import OrderFeedback

class OrderFeedbackSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderFeedback
        fields = "__all__"
        read_only_fields = ["user", "order", "created_at"]