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
        "read_by_customer",
        "read_by_admin",
    )

    list_filter = (
        "sender_type",
        "message_type",
        "read_by_customer",
        "read_by_admin",
    )

    search_fields = (
        "content",
        "sender__username",
    )