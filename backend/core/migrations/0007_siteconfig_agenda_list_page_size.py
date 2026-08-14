from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_siteconfig_featured_video_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="agenda_list_page_size",
            field=models.PositiveIntegerField(default=20),
        ),
    ]
