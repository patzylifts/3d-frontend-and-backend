from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('store', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='delivery_date',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='order',
            name='delivery_time',
            field=models.TimeField(null=True, blank=True),
        ),
    ]