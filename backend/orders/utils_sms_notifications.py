# orders/utils_sms_notifications.py
from utils.sms import send_sms

def send_order_status_sms(order):
    """
    Sends SMS based on order status.
    """
    if not order.phone:
        print("⚠️ No phone number for this order")
        return

    status_messages = {
        "awaiting_downpayment": f"Hi {order.full_name}, your order #{order.id} has been accepted. Please proceed with your downpayment.",
        
        "processing": f"Hi {order.full_name}, your order #{order.id} is now being processed.",
        
        "ready_for_delivery": f"Good news! Your order #{order.id} is ready for delivery.",
        
        "out_for_delivery": f"Your order #{order.id} is now out for delivery. Please be ready to receive it.",
        
        "delivered": f"Your order #{order.id} has been delivered. Thank you for ordering!",
        
        "completed": f"Order #{order.id} is now completed. We hope you enjoyed it!",
        
        "cancelled": f"Your order #{order.id} has been cancelled.",
        
        "rejected": f"Sorry, your order #{order.id} was rejected. Reason: {order.rejection_reason or 'N/A'}",
    }

    message = status_messages.get(order.status)

    if not message:
        print(f"⚠️ No SMS template for status: {order.status}")
        return

    print(f"📩 Sending SMS to {order.phone}: {message}")
    send_sms(order.phone, message)