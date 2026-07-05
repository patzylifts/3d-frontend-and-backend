# chat/urls.py
from django.urls import path
from . import views

urlpatterns = [

    path("orders/<int:order_id>/", views.conversation_detail),

    path("orders/<int:order_id>/send/", views.send_message),
]