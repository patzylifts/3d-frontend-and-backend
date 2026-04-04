# store/models.py
from django.db import models
from django.contrib.auth.models import User

# CATEGORY
class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

# PRODUCT
class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# USER
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    # Identity
    middle_name = models.CharField(max_length=30, blank=True, null=True)
    phone = models.CharField(max_length=15)
    
    # Address
    street = models.CharField(max_length=150, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    province = models.CharField(max_length=50, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)

    # Optional
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    newsletter_subscribed = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user} Profile"

# ORDER
class Order(models.Model):

    STATUS_CHOICES = [
        ("pending_review", "Pending Review"),
        ("awaiting_downpayment", "Awaiting Downpayment"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("rejected", "Rejected"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    # delivery info
    full_name = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    street = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    delivery_date = models.DateField()
    delivery_time = models.TimeField(blank=True, null=True)
    order_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending_review"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending"
    )

    rejection_reason = models.TextField(blank=True, null=True)
    def __str__(self):
        return f"Order {self.id} - {self.user}"
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    customization = models.JSONField(blank=True, null=True)  # placeholder for 3D cake customization

    def __str__(self):
        return f"{self.quantity} x {self.product.name}" 
    
    @property
    def subtotal(self):
        return self.quantity * self.price
    
# CART
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Cart {self.id} for {self.user}"
    
    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())
    
    
class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    customization = models.ForeignKey('CakeCustomization', on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    
    def __str__(self):
        if self.product:
            return f"{self.quantity} x {self.product.name}"
        elif self.customization:
            return f"{self.quantity} x Custom {self.customization.shape} {self.customization.flavor} Cake"
        return f"CartItem {self.id}"
    
    @property
    def item_price(self):
        if self.product:
            return self.product.price
        elif self.customization:
            return self.customization.price
        return 0
    
    @property
    def subtotal(self):
        return self.quantity * self.item_price
    

# CAKE CUSTOMIZATION
class CakeCustomization(models.Model):
    SHAPE_CHOICES = [
        ("round", "Round"),
        ("rectangle", "Rectangle"),
    ]

    FLAVOR_CHOICES = [
        ("Choco Moist", "Choco Moist"),
        ("Vanilla Chiffon", "Vanilla Chiffon"),
        ("Ube Chiffon", "Ube Chiffon"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    shape = models.CharField(max_length=20, choices=SHAPE_CHOICES, default="round")
    cake_color = models.CharField(max_length=20, default="#683434")
    flavor = models.CharField(max_length=50, choices=FLAVOR_CHOICES, default="Choco Moist")
    has_candle = models.BooleanField(default=False)
    has_chocolate = models.BooleanField(default=False)
    has_balls = models.BooleanField(default=False)
    has_nuts = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=500.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CakeCustomization {self.id} - {self.shape} {self.flavor}"
