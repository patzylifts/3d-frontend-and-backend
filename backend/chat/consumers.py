# chat/consumers.py
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from store.models import Order
from .models import Conversation
from .services import ChatService

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.order_id = self.scope["url_route"]["kwargs"]["order_id"]
        user = self.scope["user"]

        if user.is_anonymous:
            await self.close(code=4001)
            return
        
        self.room_group_name = f"order_{self.order_id}"
        allowed = await self.can_access_order(user)

        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )

        await self.accept()

    async def disconnect(self, close_code):

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )
        
    @database_sync_to_async
    def can_access_order(self, user):

        from store.models import Order

        try:
            order = Order.objects.get(id=self.order_id)

        except Order.DoesNotExist:
            return False

        if user.is_staff or user.is_superuser:
            return True

        return order.user_id == user.id

    async def receive(self, text_data):

        data = json.loads(text_data)
        message = data.get("message", "")
        user = self.scope["user"]
        saved_message = await self.save_message(
            message,
            user,
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": saved_message,
            },
        )

    async def chat_message(self, event):

        await self.send(
            text_data=json.dumps(event["message"])
        )

    @database_sync_to_async
    def save_message(self, message, user):

        order = Order.objects.get(
            id=self.order_id
        )

        conversation, created = Conversation.objects.get_or_create(
            order=order
        )

        if user.is_staff:

            sender_type = "admin"

        else:

            sender_type = "customer"

        msg = ChatService.create_message(
            conversation=conversation,
            sender=user,
            sender_type=sender_type,
            content=message,
        )

        return {
            "id": msg.id,
            "sender": msg.sender.id,
            "sender_name": msg.sender.username,
            "sender_type": msg.sender_type,
            "message": msg.content,
            "created_at": msg.created_at.isoformat(),
        }