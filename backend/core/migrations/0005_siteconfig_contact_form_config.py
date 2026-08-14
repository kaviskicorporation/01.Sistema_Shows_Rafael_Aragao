from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_siteconfig_agenda_default_view"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="contact_form_config",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
