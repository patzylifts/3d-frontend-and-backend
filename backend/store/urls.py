from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import MyTokenObtainPairView

urlpatterns = [
    
    # Register
    path('register/', views.register_view),
    # Login
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # Token Refresher
    path('token/refresh/', TokenRefreshView.as_view(), name='token_obtain_refresh'),
    
    # Customer Profile
    path('profile/', views.profile_view, name='profile'),
    
    # Products
    path('products/', views.get_products, name='product_list'),
    path('products/<int:pk>/', views.get_product),
    
    #Categories
    path('categories/', views.get_categories, name='category_list'),
    
    # Cart
    path('cart/', views.get_cart),
    path('cart/add/', views.add_to_cart),
    path('cart/remove/', views.remove_from_cart),
    path('cart/update/', views.update_cart_quantity),
    
    # Orders
    path('orders/create/', views.create_order),
]