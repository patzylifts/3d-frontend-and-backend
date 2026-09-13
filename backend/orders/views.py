# orders/views.py
from django.db import transaction
from django.utils import timezone
from chat.models import Conversation
from chat.services import ChatService
from .serializers import QuotationSerializer
import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from store.models import Order, Product
from .models import ProductReview
from .serializers import OrderSerializer
from .serializers_feedback import ProductReviewSerializer
from orders.utils_sms_notifications import send_order_status_sms
from payments.services import (
    PaymentAlreadyCompletedError,
    PaymentGatewayError,
    expire_pending_checkout_sessions,
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_history(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_orders(request):
    user = request.user
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id)

    except Order.DoesNotExist:
        return Response(
            {
                "error": "Order does not exist",
                "order_id": order_id,
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if order.user_id != request.user.id:
        return Response(
            {
                "error": "You do not have access to this order",
                "order_id": order_id,
            },
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = OrderSerializer(order)

    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_quotation(request, order_id):

    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    if not order.is_uploaded_cake:
        return Response(
            {"error": "Quotation acceptance is only available for uploaded cake orders."},
            status=400
        )

    if order.status != "awaiting_customer_response":
        return Response(
            {"error": "This order is not waiting for quotation acceptance."},
            status=400
        )

    quotation = order.quotations.filter(
        status="pending"
    ).order_by("-created_at").first()

    if not quotation:
        return Response(
            {"error": "No active quotation found for this order."},
            status=400
        )

    with transaction.atomic():

        quotation.status = "accepted"
        quotation.accepted_at = timezone.now()
        quotation.save(
            update_fields=[
                "status",
                "accepted_at",
            ]
        )

        order.quotations.filter(
            status="pending"
        ).exclude(
            id=quotation.id
        ).update(
            status="replaced"
        )

        order.quoted_price = quotation.amount
        order.total_amount = quotation.amount
        order.status = "awaiting_downpayment"

        order_item = order.items.filter(
            customization__uploaded_cake=True
        ).first()

        if order_item:
            order_item.price = quotation.amount
            order_item.save(
                update_fields=["price"]
            )

        order.save(
            update_fields=[
                "quoted_price",
                "total_amount",
                "status",
            ]
        )

        conversation, _ = Conversation.objects.get_or_create(
            order=order
        )

        system_message = ChatService.create_system_message(
            conversation=conversation,
            content=f"Quotation accepted · ₱{quotation.amount:,.2f}",
            metadata={
                "event": "quotation_accepted",
                "quotation_id": quotation.id,
                "order_id": order.id,
                "amount": str(quotation.amount),
                "status": "accepted",
            },
            read_by_customer=True,
            read_by_admin=False,
        )

        transaction.on_commit(
            lambda msg=system_message:
            ChatService.broadcast_message(msg)
        )

    return Response({
        "message": "Quotation accepted successfully.",
        "quotation": QuotationSerializer(quotation).data,
        "order": OrderSerializer(order).data,
    })

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    total_paid = sum(
        payment.amount
        for payment in order.payments.filter(
            status__in=["partial", "paid"]
        )
    )

    can_cancel = (
        order.status == "pending_review"
        or order.status == "awaiting_customer_response"
        or (
            order.status == "awaiting_downpayment"
            and total_paid == 0
        )
    )

    if not can_cancel:
        return Response(
            {
                "error":
                    "This order can no longer be cancelled."
            },
            status=400
        )

    try:
        expire_pending_checkout_sessions(order)

    except PaymentAlreadyCompletedError:
        # Very important race-condition protection:
        #
        # PayMongo says this checkout already contains a paid
        # transaction even if our webhook hasn't reached us yet.
        return Response(
            {
                "error":
                    "A payment was already completed for this order. "
                    "Please refresh the order before cancelling."
            },
            status=409
        )

    except PaymentGatewayError:
        # Do not cancel locally if we cannot guarantee that the
        # existing PayMongo checkout has been closed.
        return Response(
            {
                "error":
                    "We could not safely close the active payment "
                    "checkout. Please try again."
            },
            status=503
        )

    order.status = "cancelled"
    order.payment_status = "cancelled"

    order.save(
        update_fields=[
            "status",
            "payment_status",
        ]
    )

    send_order_status_sms(order)

    return Response({
        "message": "Order cancelled successfully"
    })

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def product_review(request, order_id, item_id):

    try:
        order = Order.objects.get(
            id=order_id,
            user=request.user
        )

    except Order.DoesNotExist:
        return Response(
            {"error": "Order not found"},
            status=404
        )

    try:
        item = order.items.select_related("product").get(
            id=item_id
        )

    except order.items.model.DoesNotExist:
        return Response(
            {"error": "Order item not found"},
            status=404
        )

    if item.product is None:
        return Response(
            {"error": "This item is not a standard product."},
            status=400
        )

    existing_review = ProductReview.objects.filter(
        order_item=item
    ).first()

    if request.method == "GET":

        if not existing_review:
            return Response({
                "review": None
            })

        return Response({
            "review": ProductReviewSerializer(existing_review).data
        })

    if order.status != "delivered":
        return Response(
            {"error": "You can only review products from delivered orders."},
            status=400
        )

    if existing_review:
        return Response(
            {"error": "You already reviewed this product for this order."},
            status=400
        )

    serializer = ProductReviewSerializer(
        data=request.data
    )

    if serializer.is_valid():

        review = serializer.save(
            order_item=item,
            product=item.product,
            user=request.user
        )

        return Response({
            "message": "Product review submitted successfully.",
            "review": ProductReviewSerializer(review).data
        }, status=201)

    return Response(
        serializer.errors,
        status=400
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def product_reviews(request, product_id):

    try:
        product = Product.objects.get(
            id=product_id
        )

    except Product.DoesNotExist:
        return Response(
            {"error": "Product not found"},
            status=404
        )

    reviews = ProductReview.objects.filter(
        product=product
    ).select_related(
        "user"
    ).order_by("-created_at")

    serializer = ProductReviewSerializer(
        reviews,
        many=True
    )

    average_rating = 0

    if reviews.exists():
        average_rating = round(
            sum(review.rating for review in reviews) / reviews.count(),
            1
        )

    return Response({
        "average_rating": average_rating,
        "review_count": reviews.count(),
        "reviews": serializer.data,
    })