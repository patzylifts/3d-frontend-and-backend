from django.urls import path
from . import views

urlpatterns = [
    # Products
    path('products/', views.get_products, name='product_list'),
    path('products/<int:pk>/', views.get_product),
    
    #Categories
    path('categories/', views.get_categories, name='category_list'),
    
    #Cart
    path('cart/', views.get_cart),
    path('cart/add/', views.add_to_cart),
    path('cart/remove/', views.remove_from_cart),
]