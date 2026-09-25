from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0029_alter_order_delivery_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="cartitem",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
