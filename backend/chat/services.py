# chat/services.py
from .models import Message


class ChatService:

    @staticmethod
    def create_message(
        *,
        conversation,
        sender,
        sender_type,
        content,
        message_type="text",
        attachment=None,
        metadata=None,
    ):

        if metadata is None:
            metadata = {}

        return Message.objects.create(
            conversation=conversation,
            sender=sender,
            sender_type=sender_type,
            message_type=message_type,
            content=content,
            attachment=attachment,
            metadata=metadata,
        )

    @staticmethod
    def create_system_message(
        *,
        conversation,
        content,
        metadata=None,
    ):

        return ChatService.create_message(
            conversation=conversation,
            sender=None,
            sender_type="system",
            message_type="system",
            content=content,
            metadata=metadata or {},
        )