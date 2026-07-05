# chat/serializers.py
from rest_framework import serializers
from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):

    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_name",
            "sender_type",
            "message_type",
            "content",
            "attachment",
            "metadata",
            "created_at",
            "is_read",
        ]

        read_only_fields = (
            "conversation",
            "sender",
            "sender_type",
            "created_at",
            "is_read",
        )

    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.username
        return "System"

class ConversationSerializer(serializers.ModelSerializer):

    messages = MessageSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            "id",
            "order",
            "created_at",
            "messages",
        ]
        
class SendMessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = [
            "content",
            "attachment",
        ]