# store/views.py
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from .token_serializers import MyTokenObtainPairSerializer

from django.contrib.auth.models import BaseUserManager

from .models import Product, Category, Cart, CartItem, Order, OrderItem, UserProfile, CakeCustomization
from .serializers import ProductSerializer, CategorySerializer, CartSerializer, CartItemSerializer
from .serializers import RegisterSerializer, UserSerializer, UserProfileSerializer, CakeCustomizationSerializer

from .models_verification import SMSVerification
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    
# Product
@api_view(['GET'])
def get_products(request):
    products = Product.objects.all()
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_product(request, pk):
    try:
        product = Product.objects.get(id=pk)
        serializer = ProductSerializer(product, context = {'request': request})
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

# Category
@api_view(['GET'])
def get_categories(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)

# Cart
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    serializer = CartSerializer(cart)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    product = Product.objects.get(id=product_id)
    cart, created = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        item.quantity += 1
        item.save()
    return Response({'message': 'Product added to cart', "cart":CartSerializer(cart).data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_cart_quantity(request):
    item_id = request.data.get('item_id')
    quantity = request.data.get('quantity')
    
    if not item_id or quantity is None:
        return Response({'error': 'Item ID and quantity are required'}, status=400)
    
    try:
        item = CartItem.objects.get(id=item_id)
        if int(quantity) < 1:
            item.delete()
            return Response({'error': 'Quantity must be at least 1'}, status=400)
        item.quantity = quantity
        item.save()
        serializer = CartItemSerializer(item)
        return Response(serializer.data)
    
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=400)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request):
    item_id = request.data.get('item_id')
    CartItem.objects.filter(id=item_id).delete()
    return Response({'message': 'Item removed from cart'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):

    try:
        data = request.data
        profile = request.user.userprofile
        street = data.get("street") or profile.street
        city = data.get("city") or profile.city
        province = data.get("province") or profile.province
        postal_code = data.get("postal_code") or profile.postal_code
        full_name = profile.user.first_name + " " + profile.user.last_name
        phone = profile.phone
        delivery_date = data.get("delivery_date")
        delivery_time = data.get("delivery_time")
        notes = data.get("notes")

        if not full_name or not phone or not street:
            return Response({"error": "Missing required fields"}, status=400)

        cart, created = Cart.objects.get_or_create(user=request.user)

        if not cart.items.exists():
            return Response({"error": "Cart is empty"}, status=400)

        # Calculate total properly for both products and customizations
        total = sum(item.subtotal for item in cart.items.all())

        order = Order.objects.create(
            user=request.user, 
            full_name=full_name, 
            phone=phone, 
            street=street, 
            city=city, 
            province=province, 
            postal_code=postal_code, 
            delivery_date=delivery_date, 
            delivery_time=delivery_time, 
            order_notes=notes, 
            total_amount=total, 
            status="pending_review", 
            payment_status="pending"
        )

        # Handle both regular products and customizations
        for item in cart.items.all():
            if item.product:
                # Regular product
                OrderItem.objects.create(
                    order=order, 
                    product=item.product, 
                    quantity=item.quantity, 
                    price=item.product.price
                )
            elif item.customization:
                # Customized cake
                OrderItem.objects.create(
                    order=order, 
                    product=None, 
                    quantity=item.quantity, 
                    price=item.customization.price,
                    customization=item.customization.get_customization_dict()
                )

        cart.items.all().delete()

        return Response({
            "message": "Order submitted for review",
            "order_id": order.id
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)
            
# REGISTER
@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    phone = request.data.get("phone")
    verified = SMSVerification.objects.filter(
        phone=phone,
        is_verified=True
    ).exists()

    if not verified:
        return Response({"error": "Phone not verified"}, status=400)
    
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({"message":"User Created Successfully", "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# USER PROFILE
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, created = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            request.user.first_name = request.data.get('first_name', request.user.first_name)
            request.user.last_name = request.data.get('last_name', request.user.last_name)
            request.user.email = request.data.get('email', request.user.email)
            request.user.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# CAKE CUSTOMIZATION → Add Custom Cake to Cart
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_custom_cake_to_cart(request):
    """
    Saves a CakeCustomization and adds it to the user's cart as a CartItem.
    """
    serializer = CakeCustomizationSerializer(data=request.data)
    if serializer.is_valid():
        customization = serializer.save(user=request.user)
        
        # Get or create the user's cart
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        # Create a CartItem linked to this customization (no product)
        CartItem.objects.create(
            cart=cart,
            customization=customization,
            quantity=1,
        )
        
        return Response({
            "message": "Custom cake added to cart",
            "cart": CartSerializer(cart).data,
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)