from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0017_custom_cake_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="cakecustomization",
            name="topping_layout",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
