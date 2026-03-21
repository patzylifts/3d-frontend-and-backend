from django.urls import path
from . import views
from . import admin_views

urlpatterns = [
    # Customer
    # path('place/', views.place_order, name='place_order'),
    path('history/', views.order_history, name='order_history'),
    path('<int:order_id>/', views.order_detail, name='order_detail'),
    
    # Admin placeholder
    # path('<int:order_id>/update/', views.update_order_status, name='update_order_status'),
    
    # Admin Orders
    path('admin/orders/', admin_views.admin_orders),
    path('admin/orders/<int:order_id>/', admin_views.admin_order_detail),
    # path('admin/orders/<int:order_id>/update/', admin_views.admin_update_order),
    path('admin/orders/<int:order_id>/review/', admin_views.admin_review_order),
]