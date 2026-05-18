# store/admin_views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from .models import AddonPricing, CustomCakePricing, Product
from .serializers import (
    AddonPricingSerializer,
    CustomCakePricingSerializer,
    ProductSerializer,
)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_products(request):
    products = Product.objects.all().order_by('-created_at')
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_product(request):
    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_product(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProductSerializer(product, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_product(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    product.delete()
    return Response({"message": "Product deleted"})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_custom_pricing(request):
    pricing = CustomCakePricing.objects.all().order_by('tier', 'size', 'flavor')
    serializer = CustomCakePricingSerializer(pricing, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_custom_pricing(request):
    serializer = CustomCakePricingSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_custom_pricing(request, pk):
    try:
        pricing = CustomCakePricing.objects.get(id=pk)
    except CustomCakePricing.DoesNotExist:
        return Response({"error": "Custom pricing not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = CustomCakePricingSerializer(pricing, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_custom_pricing(request, pk):
    try:
        pricing = CustomCakePricing.objects.get(id=pk)
    except CustomCakePricing.DoesNotExist:
        return Response({"error": "Custom pricing not found"}, status=status.HTTP_404_NOT_FOUND)

    pricing.delete()
    return Response({"message": "Custom pricing deleted"})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_get_addon_pricing(request):
    addons = AddonPricing.objects.all().order_by('name')
    serializer = AddonPricingSerializer(addons, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_create_addon_pricing(request):
    serializer = AddonPricingSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def admin_update_addon_pricing(request, pk):
    try:
        addon = AddonPricing.objects.get(id=pk)
    except AddonPricing.DoesNotExist:
        return Response({"error": "Addon not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = AddonPricingSerializer(addon, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_addon_pricing(request, pk):
    try:
        addon = AddonPricing.objects.get(id=pk)
    except AddonPricing.DoesNotExist:
        return Response({"error": "Addon not found"}, status=status.HTTP_404_NOT_FOUND)

    addon.delete()
    return Response({"message": "Addon pricing deleted"})
