from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0028_cakecustomization_inscription_color"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="delivery_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
