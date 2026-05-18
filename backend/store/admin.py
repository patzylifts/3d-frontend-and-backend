from django.contrib import admin
from .models import *
from .models_verification import SMSVerification

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(CustomCakePricing)
admin.site.register(AddonPricing)
admin.site.register(UserProfile)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(CakeCustomization)

admin.site.register(SMSVerification)
