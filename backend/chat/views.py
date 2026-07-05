# chat/views.py
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from rest_framework.response import Response

from store.models import Order

from .models import Conversation
from .services import ChatService
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
        message = ChatService.create_message(
            conversation=conversation,
            sender=request.user,
            sender_type="admin" if request.user.is_staff else "customer",
            content=serializer.validated_data.get("content", ""),
            attachment=serializer.validated_data.get("attachment"),
        )

        return Response(MessageSerializer(message).data)

    return Response(
        serializer.errors,
        status=400
    )
    
# READ ENDPOINT
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_messages_read(request, order_id):

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

    conversation = order.conversation

    if request.user.is_staff or request.user.is_superuser:

        updated = conversation.messages.filter(
            sender_type="customer",
            read_by_admin=False
        ).update(read_by_admin=True)

    else:

        updated = conversation.messages.filter(
            sender_type__in=["admin", "system"],
            read_by_customer=False
        ).update(read_by_customer=True)

    return Response({
        "messages_marked_read": updated
    })