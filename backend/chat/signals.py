# chat/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver

from store.models import Order
from .models import Conversation

@receiver(post_save, sender=Order)
def create_order_conversation(sender, instance, created, **kwargs):
    if created:
        Conversation.objects.create(order=instance)