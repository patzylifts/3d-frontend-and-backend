# store/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import admin_views, views
from .views import MyTokenObtainPairView
from .views_verification import send_verification_code, verify_code


urlpatterns = [
    path('register/', views.register_view),
    path('send-code/', send_verification_code),
    path('verify-code/', verify_code),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_obtain_refresh'),
    path('profile/', views.profile_view, name='profile'),

    path('products/', views.get_products, name='product_list'),
    path('products/<int:pk>/', views.get_product),
    path('categories/', views.get_categories, name='category_list'),

    path('custom-pricing/', views.get_custom_pricing),

    path('admin/products/', admin_views.admin_get_products),
    path('admin/products/create/', admin_views.admin_create_product),
    path('admin/products/<int:pk>/update/', admin_views.admin_update_product),
    path('admin/products/<int:pk>/delete/', admin_views.admin_delete_product),

    path('admin/custom-pricing/', admin_views.admin_get_custom_pricing),
    path('admin/custom-pricing/create/', admin_views.admin_create_custom_pricing),
    path('admin/custom-pricing/<int:pk>/update/', admin_views.admin_update_custom_pricing),
    path('admin/custom-pricing/<int:pk>/delete/', admin_views.admin_delete_custom_pricing),

    path('admin/addon-pricing/', admin_views.admin_get_addon_pricing),
    path('admin/addon-pricing/create/', admin_views.admin_create_addon_pricing),
    path('admin/addon-pricing/<int:pk>/update/', admin_views.admin_update_addon_pricing),
    path('admin/addon-pricing/<int:pk>/delete/', admin_views.admin_delete_addon_pricing),

    path('cart/', views.get_cart),
    path('cart/add/', views.add_to_cart),
    path('cart/remove/', views.remove_from_cart),
    path('cart/update/', views.update_cart_quantity),

    path('orders/create/', views.create_order),
    path('cake-customization/', views.add_custom_cake_to_cart),
]
