# orders/urls.py
from django.urls import path
from . import views
from . import admin_views
from orders.views import cancel_order

urlpatterns = [
    # Customer
    path('history/', views.order_history, name='order_history'),
    path('<int:order_id>/', views.order_detail, name='order_detail'),
    path('customer/orders/', views.customer_orders),
    path('customer/orders/<int:order_id>/', views.customer_order_detail, name='customer_order_detail'),
    path('<int:order_id>/cancel/', cancel_order, name='cancel_order'),
    
    # Admin Orders
    path('admin/orders/', admin_views.admin_orders),
    path('admin/orders/<int:order_id>/', admin_views.admin_order_detail),
    path('admin/orders/<int:order_id>/review/', admin_views.admin_review_order),
]