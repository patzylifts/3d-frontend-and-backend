from django.urls import path
from . import views

urlpatterns = [
    # Customer
    path('place/', views.place_order, name='place_order'),
    path('history/', views.order_history, name='order_history'),
    path('<int:order_id>/', views.order_detail, name='order_detail'),
    
    # Admin placeholder
    path('<int:order_id>/update/', views.update_order_status, name='update_order_status'),
]