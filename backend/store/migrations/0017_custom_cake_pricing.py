# Generated manually for admin-editable custom cake pricing.

from decimal import Decimal

from django.db import migrations, models


CAKE_SIZES = [
    {
        "tier": "1 Tier Cake",
        "sizes": ["Bento Cake", "Tall Bento Cake", "Standard", "Tall Cake"],
        "prices": {
            "Choco Moist": Decimal("1000.00"),
            "Vanilla Chiffon": Decimal("900.00"),
            "Ube Chiffon": Decimal("900.00"),
        },
    },
    {
        "tier": "Mini 2 Tier",
        "sizes": ["6x4 & 4x4", "6x6 Cake", "6x8 Cake", "8x5 Cake"],
        "prices": {
            "Choco Moist": Decimal("1800.00"),
            "Vanilla Chiffon": Decimal("1600.00"),
            "Ube Chiffon": Decimal("1600.00"),
        },
    },
    {
        "tier": "3 Tier Cake",
        "sizes": ["4x5, 6x6 & 8x5"],
        "prices": {
            "Choco Moist": Decimal("2800.00"),
            "Vanilla Chiffon": Decimal("2500.00"),
            "Ube Chiffon": Decimal("2500.00"),
        },
    },
    {
        "tier": "4 Tier Cake",
        "sizes": ["4x4 & 6x6, 8x5 & 10x4"],
        "prices": {
            "Choco Moist": Decimal("3800.00"),
            "Vanilla Chiffon": Decimal("3400.00"),
            "Ube Chiffon": Decimal("3400.00"),
        },
    },
]

ADDONS = [
    {"key": "candle", "name": "Candle", "price": Decimal("100.00")},
    {"key": "chocolate", "name": "Chocolate", "price": Decimal("200.00")},
    {"key": "balls", "name": "Balls", "price": Decimal("100.00")},
    {"key": "nuts", "name": "Nuts", "price": Decimal("75.00")},
]


def seed_pricing(apps, schema_editor):
    CustomCakePricing = apps.get_model("store", "CustomCakePricing")
    AddonPricing = apps.get_model("store", "AddonPricing")

    for tier_group in CAKE_SIZES:
        for size in tier_group["sizes"]:
            for flavor, price in tier_group["prices"].items():
                CustomCakePricing.objects.get_or_create(
                    tier=tier_group["tier"],
                    size=size,
                    flavor=flavor,
                    defaults={"price": price},
                )

    for addon in ADDONS:
        AddonPricing.objects.get_or_create(
            key=addon["key"],
            defaults={"name": addon["name"], "price": addon["price"]},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0016_alter_order_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='AddonPricing',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(choices=[('candle', 'Candle'), ('chocolate', 'Chocolate'), ('balls', 'Balls'), ('nuts', 'Nuts')], max_length=30, unique=True)),
                ('name', models.CharField(max_length=50)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CustomCakePricing',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tier', models.CharField(max_length=50)),
                ('size', models.CharField(max_length=100)),
                ('flavor', models.CharField(choices=[('Choco Moist', 'Choco Moist'), ('Vanilla Chiffon', 'Vanilla Chiffon'), ('Ube Chiffon', 'Ube Chiffon')], max_length=50)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
            ],
            options={
                'ordering': ['tier', 'size', 'flavor'],
            },
        ),
        migrations.AddConstraint(
            model_name='customcakepricing',
            constraint=models.UniqueConstraint(fields=('tier', 'size', 'flavor'), name='unique_custom_cake_pricing'),
        ),
        migrations.RunPython(seed_pricing, migrations.RunPython.noop),
    ]
