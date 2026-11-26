# orders/utils_sms_notifications.py
from utils.sms import send_sms

def send_order_status_sms(order):
    """
    Sends SMS notifications to customers based on order status.
    Identifies the shop as Smiley Page Corner.
    """

    if not order.phone:
        print("No phone number for this order")
        return

    shop_name = "Smiley Page Corner"
    customer_name = order.full_name

    status_messages = {
        "awaiting_downpayment": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} has been accepted. "
            "Please proceed with your downpayment."
        ),

        "processing": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} is now being processed."
        ),

        "ready_for_delivery": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Good news! Your order #{order.id} is ready for delivery."
        ),

        "out_for_delivery": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} is now out for delivery. "
            "Please be ready to receive it."
        ),

        "delivered": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} has been delivered. "
            "Thank you for ordering!"
        ),

        "completed": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} is now completed. "
            "We hope you enjoyed it!"
        ),

        "cancelled": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Your order #{order.id} has been cancelled."
        ),

        "rejected": (
            f"Hi {customer_name}! This is {shop_name}. "
            f"Sorry, your order #{order.id} was rejected. "
            f"Reason: {order.rejection_reason or 'N/A'}"
        ),
    }

    message = status_messages.get(order.status)

    if not message:
        print(f"No SMS template for status: {order.status}")
        return

    print(f"Sending SMS to {order.phone}")
    print(f"MESSAGE: {message}")

    sms_result = send_sms(order.phone, message)

    print("SMS RESULT:", sms_result)
