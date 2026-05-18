# store/serializers.py
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from rest_framework import serializers

from .models import (
    AddonPricing,
    CakeCustomization,
    Cart,
    CartItem,
    Category,
    CustomCakePricing,
    Product,
    UserProfile,
)


phone_validator = RegexValidator(
    regex=r'^09\d{9}$',
    message="Phone number must be 11 digits and start with 09"
)


class CustomCakePricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomCakePricing
        fields = ['id', 'tier', 'size', 'flavor', 'price']
        read_only_fields = ['id']


class AddonPricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AddonPricing
        fields = ['id', 'key', 'name', 'price']
        read_only_fields = ['id']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ProductSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all()
    )

    class Meta:
        model = Product
        fields = '__all__'


class CakeCustomizationSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CakeCustomization
        fields = ['id', 'shape', 'cake_color', 'flavor', 'tier', 'size',
                  'has_candle', 'has_chocolate', 'has_balls', 'has_nuts', 'price', 'created_at']
        read_only_fields = ['id', 'price', 'created_at']


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True, default=None)
    product_image = serializers.ImageField(source='product.image', read_only=True, default=None)
    customization_detail = CakeCustomizationSerializer(source='customization', read_only=True)
    item_name = serializers.SerializerMethodField()
    item_unit_price = serializers.SerializerMethodField()
    is_custom_cake = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'cart', 'product', 'customization', 'quantity',
                  'product_name', 'product_price', 'product_image',
                  'customization_detail', 'item_name', 'item_unit_price', 'is_custom_cake']

    def get_item_name(self, obj):
        if obj.product:
            return obj.product.name
        elif obj.customization:
            return f"Custom {obj.customization.get_shape_display()} {obj.customization.flavor} Cake"
        return "Unknown Item"

    def get_item_unit_price(self, obj):
        if obj.product:
            return str(obj.product.price)
        elif obj.customization:
            return str(obj.customization.price)
        return "0.00"

    def get_is_custom_cake(self, obj):
        return obj.customization is not None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class RegisterSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(validators=[phone_validator])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "password", "password2", "phone"]

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        phone = validated_data.pop("phone")
        validated_data.pop("password2")

        user = User.objects.create_user(**validated_data)

        UserProfile.objects.create(
            user=user,
            phone=phone
        )

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['user', 'middle_name', 'phone', 'street', 'city', 'province', 'postal_code', 'profile_picture']
