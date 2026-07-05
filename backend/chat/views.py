# chat/views.py
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from rest_framework.response import Response

from store.models import Order

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, SendMessageSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_detail(request, order_id):

    try:
        if request.user.is_staff or request.user.is_superuser:
            order = Order.objects.get(id=order_id)
        else:
            order = Order.objects.get(
                id=order_id,
                user=request.user
            )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    conversation, created = Conversation.objects.get_or_create(
        order=order
    )
    serializer = ConversationSerializer(conversation)

    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request, order_id):

    try:
        if request.user.is_staff or request.user.is_superuser:
            order = Order.objects.get(id=order_id)
        else:
            order = Order.objects.get(
                id=order_id,
                user=request.user
            )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    conversation, created = Conversation.objects.get_or_create(
        order=order
    )

    serializer = SendMessageSerializer(
        data=request.data
    )

    if serializer.is_valid():
        serializer.save(
            conversation=conversation,
            sender=request.user,
            sender_type="admin" if request.user.is_staff else "customer"
        )

        return Response(serializer.data)

    return Response(
        serializer.errors,
        status=400
    )