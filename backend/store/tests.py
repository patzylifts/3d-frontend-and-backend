from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APIClient, APITestCase

from .models import AddonPricing, CakeCustomization, CartItem, CustomCakePricing


class CustomCakePricingTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="customer",
            password="password123",
        )
        self.admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password123",
        )
        self.client = APIClient()

        self.base_price, _ = CustomCakePricing.objects.update_or_create(
            tier="1 Tier Cake",
            size="Bento Cake",
            flavor="Choco Moist",
            defaults={"price": Decimal("1000.00")},
        )
        AddonPricing.objects.update_or_create(
            key="candle",
            defaults={"name": "Candle", "price": Decimal("100.00")},
        )
        AddonPricing.objects.update_or_create(
            key="chocolate",
            defaults={"name": "Chocolate", "price": Decimal("200.00")},
        )
        AddonPricing.objects.update_or_create(
            key="balls",
            defaults={"name": "Balls", "price": Decimal("100.00")},
        )
        AddonPricing.objects.update_or_create(
            key="nuts",
            defaults={"name": "Nuts", "price": Decimal("75.00")},
        )

    def custom_cake_payload(self, **overrides):
        payload = {
            "shape": "round",
            "cake_color": "#683434",
            "flavor": "Choco Moist",
            "tier": "1 Tier Cake",
            "size": "Bento Cake",
            "has_candle": True,
            "has_chocolate": False,
            "has_balls": True,
            "has_nuts": False,
            "price": "1.00",
        }
        payload.update(overrides)
        return payload

    def test_custom_cake_price_uses_base_and_addons(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            "/api/cake-customization/",
            self.custom_cake_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        customization = CakeCustomization.objects.get()
        self.assertEqual(customization.price, Decimal("1200.00"))
        self.assertTrue(CartItem.objects.filter(customization=customization).exists())

    def test_submitted_price_is_ignored(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            "/api/cake-customization/",
            self.custom_cake_payload(price="999999.00", has_candle=False, has_balls=False),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CakeCustomization.objects.get().price, Decimal("1000.00"))

    def test_missing_base_price_returns_400(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            "/api/cake-customization/",
            self.custom_cake_payload(size="Not Configured"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("No price is configured", response.data["error"])

    def test_admin_pricing_endpoint_rejects_non_admin(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get("/api/admin/custom-pricing/")

        self.assertEqual(response.status_code, 403)

    def test_admin_can_update_custom_cake_price(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/admin/custom-pricing/{self.base_price.id}/update/",
            {"price": "1250.00"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.base_price.refresh_from_db()
        self.assertEqual(self.base_price.price, Decimal("1250.00"))
