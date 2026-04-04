# payments/models.py
from django.db import models
from django.conf import settings
from store.models import Order

class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    order = models.ForeignKey(Order, related_name="payments", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    tip = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    transaction_id = models.CharField(max_length=255, blank=True, null=True)  # PayMongo checkout ID or reference

    def __str__(self):
        return f"Payment {self.id} - Order {self.order.id} - {self.status}"

    @property
    def total_paid(self):
        return self.amount + self.tip