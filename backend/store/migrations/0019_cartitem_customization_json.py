from django.db import migrations, models


def customization_to_snapshot(cake):
    return {
        "id": cake.id,
        "shape": cake.shape,
        "cake_color": cake.cake_color,
        "flavor": cake.flavor,
        "tier": cake.tier,
        "size": cake.size,
        "tier_flavors": cake.tier_flavors or {},
        "inscription_text": cake.inscription_text or "",
        "text_font": cake.text_font or "",
        "topping_layout": cake.topping_layout or {},
        "has_candle": cake.has_candle,
        "has_chocolate": cake.has_chocolate,
        "has_balls": cake.has_balls,
        "has_nuts": cake.has_nuts,
        "price": str(cake.price),
    }


def copy_customization_fk_to_json(apps, schema_editor):
    CartItem = apps.get_model("store", "CartItem")
    CakeCustomization = apps.get_model("store", "CakeCustomization")

    for item in CartItem.objects.exclude(customization_id__isnull=True):
        try:
            cake = CakeCustomization.objects.get(id=item.customization_id)
        except CakeCustomization.DoesNotExist:
            continue

        item.customization_json = customization_to_snapshot(cake)
        item.save(update_fields=["customization_json"])


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0018_cakecustomization_inscription_and_layout"),
    ]

    operations = [
        migrations.AddField(
            model_name="cartitem",
            name="customization_json",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.RunPython(copy_customization_fk_to_json, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="cartitem",
            name="customization",
        ),
        migrations.RenameField(
            model_name="cartitem",
            old_name="customization_json",
            new_name="customization",
        ),
    ]
