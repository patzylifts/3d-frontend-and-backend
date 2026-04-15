# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('<int:order_id>/checkout/', views.create_checkout_session),
    
    path('webhook/', views.paymongo_webhook),
]