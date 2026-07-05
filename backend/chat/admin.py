from django.contrib import admin
from .models import Conversation, Message

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "created_at")
    search_fields = ("order__id",)

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "sender_type",
        "message_type",
        "created_at",
        "is_read",
    )

    list_filter = (
        "sender_type",
        "message_type",
        "is_read",
    )

    search_fields = (
        "content",
        "sender__username",
    )