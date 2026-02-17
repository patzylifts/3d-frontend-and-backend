from django.urls import path, include
from . import views

urlpatterns = [
    path('products/', views.get_products, name='product_list'),
    path('categories/', views.get_categories, name='category_list'),
]