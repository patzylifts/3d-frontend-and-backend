# chat/utils.py
from .models import Message

def create_system_message(conversation, content, message_type="system", metadata=None):
    Message.objects.create(
        conversation=conversation,
        sender=None,
        sender_type="system",
        message_type=message_type,
        content=content,
        metadata=metadata or {}
    )