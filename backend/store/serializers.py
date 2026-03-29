from rest_framework import serializers
from .models import Product, Category, Cart, CartItem, UserProfile, CakeCustomization
from django.contrib.auth.models import User

# CATEGORY
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

# PRODUCT
class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer()
    
    class Meta:
        model = Product
        fields = '__all__'
        
# CART
class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    
    class Meta:
        model = CartItem
        fields = '__all__'
        
class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    
    class Meta:
        model = Cart
        fields = '__all__'


# USER
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=True)
    middle_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2', 'first_name', 'middle_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        middle_name = validated_data.pop('middle_name', '')
        last_name = validated_data.pop('last_name')
        username = validated_data['username']
        email = validated_data.get('email')
        password = validated_data['password']

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        # auto-create empty profile and store middle_name there
        UserProfile.objects.create(
            user=user,
            middle_name=middle_name,
            phone="",
            street="",
            city="",
            province="",
            postal_code="",
            profile_picture=None
        )

        return user

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # nested user info
    class Meta:
        model = UserProfile
        fields = ['user', 'middle_name', 'phone', 'street', 'city', 'province', 'postal_code', 'profile_picture']


# CAKE CUSTOMIZATION
class CakeCustomizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CakeCustomization
        fields = ['id', 'shape', 'cake_color', 'flavor', 'has_candle', 'has_chocolate', 'has_balls', 'has_nuts', 'created_at']
        read_only_fields = ['id', 'created_at']