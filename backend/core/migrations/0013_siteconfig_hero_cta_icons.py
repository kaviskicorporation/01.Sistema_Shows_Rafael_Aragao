from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_siteconfig_hero_subtitle_lead"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="hero_cta_icon_primary",
            field=models.CharField(default="calendar-days", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_cta_icon_secondary",
            field=models.CharField(default="handshake", max_length=40),
        ),
    ]
