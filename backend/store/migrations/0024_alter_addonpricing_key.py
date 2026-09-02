from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0023_order_is_uploaded_cake_order_quoted_price_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='addonpricing',
            name='key',
            field=models.CharField(
                choices=[
                    ('candle', 'Candle'),
                    ('chocolate', 'Chocolate'),
                    ('balls', 'Balls'),
                    ('nuts', 'Nuts'),
                    ('cherry', 'Cherry'),
                    ('sprinkles', 'Sprinkles'),
                ],
                max_length=30,
                unique=True,
            ),
        ),
    ]
