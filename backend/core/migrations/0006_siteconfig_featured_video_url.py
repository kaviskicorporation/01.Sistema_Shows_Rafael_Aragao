from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_siteconfig_contact_form_config"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="featured_video_url",
            field=models.CharField(
                blank=True,
                default="https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
                max_length=500,
            ),
        ),
    ]
