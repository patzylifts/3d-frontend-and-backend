from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0030_cartitem_created_at"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="cartitem",
            options={"ordering": ["-created_at", "-id"]},
        ),
    ]
