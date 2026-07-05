# chat/consumers.py
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from store.models import Order
from .models import Conversation, Message

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):

        self.order_id = self.scope["url_route"]["kwargs"]["order_id"]
        self.room_group_name = f"order_{self.order_id}"

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

    async def receive(self, text_data):

        data = json.loads(text_data)
        message = data.get("message", "")
        sender = data.get("sender", "customer")
        saved_message = await self.save_message(
            message,
            sender,
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
    def save_message(self, message, sender_type):

        order = Order.objects.get(
            id=self.order_id
        )

        conversation, created = Conversation.objects.get_or_create(
            order=order
        )

        msg = Message.objects.create(
            conversation=conversation,
            sender=None,
            sender_type=sender_type,
            message_type="text",
            content=message,
        )

        return {
            "id": msg.id,
            "sender_type": msg.sender_type,
            "message": msg.content,
            "created_at": msg.created_at.isoformat(),
        }