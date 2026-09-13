from django.db import models
from django.conf import settings
from store.models import Order


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("expired", "Expired"),
    ]

    order = models.ForeignKey(
        Order,
        related_name="payments",
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    # Amount applied to the ORDER BALANCE.
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    # Tip is charged but is NOT part of the order balance.
    tip = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending"
    )

    # Internal idempotency key used when creating the PayMongo session.
    idempotency_key = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True
    )

    # PayMongo Checkout Session ID: cs_...
    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    # Lets an unfinished checkout be resumed instead of creating duplicates.
    checkout_url = models.URLField(
        max_length=1000,
        blank=True,
        null=True
    )

    # Actual PayMongo payment ID: pay_...
    paymongo_payment_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"Payment {self.id} - "
            f"Order {self.order.id} - "
            f"{self.status}"
        )

    @property
    def total_charged(self):
        return self.amount + self.tip