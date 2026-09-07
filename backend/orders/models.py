# orders/models.py
from django.db import models
from django.contrib.auth.models import User
from store.models import Order, OrderItem, Product
    
class ProductReview(models.Model):

    RATING_CHOICES = [
        (1, "1 Star"),
        (2, "2 Stars"),
        (3, "3 Stars"),
        (4, "4 Stars"),
        (5, "5 Stars"),
    ]

    order_item = models.OneToOneField(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="product_review"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    rating = models.PositiveIntegerField(
        choices=RATING_CHOICES
    )

    comment = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.product.name} by {self.user.username}"