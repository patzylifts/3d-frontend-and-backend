# store/admin_views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Category
from .serializers import ProductSerializer

# 📌 GET ALL PRODUCTS (ADMIN)
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_products(request):
    products = Product.objects.all().order_by('-created_at')
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)

# 📌 CREATE PRODUCT
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_product(request):
    serializer = ProductSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 📌 UPDATE PRODUCT
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_product(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=404)

    serializer = ProductSerializer(product, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# 📌 DELETE PRODUCT
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_product(request, pk):
    try:
        product = Product.objects.get(id=pk)
        product.delete()
        return Response({"message": "Product deleted"})
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=404)