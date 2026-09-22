from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0027_add_structured_address_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="cakecustomization",
            name="inscription_color",
            field=models.CharField(blank=True, default="#EF4444", max_length=20),
        ),
    ]
