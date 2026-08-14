from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_siteconfig_hero_copy"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="nav_icon_cta",
            field=models.CharField(default="sparkles", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_label_agenda",
            field=models.CharField(default="Agenda", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_icon_agenda",
            field=models.CharField(default="calendar-days", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_label_sobre",
            field=models.CharField(default="Sobre", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_icon_sobre",
            field=models.CharField(default="user-round", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_label_video",
            field=models.CharField(default="Vídeo", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_icon_video",
            field=models.CharField(default="clapperboard", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_label_contato",
            field=models.CharField(default="Contratação", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_icon_contato",
            field=models.CharField(default="handshake", max_length=40),
        ),
    ]
