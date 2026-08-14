from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_siteconfig_char_urls"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="agenda_default_view",
            field=models.CharField(
                choices=[("calendar", "Calendário"), ("list", "Lista")],
                default="calendar",
                max_length=20,
            ),
        ),
    ]
