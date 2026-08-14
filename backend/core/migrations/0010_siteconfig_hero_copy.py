from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_sponsor_and_sponsors_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="hero_wordmark",
            field=models.CharField(default="Rei dos Peão", max_length=80),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_badge",
            field=models.CharField(
                default="Ao vivo · Turnê {year}", max_length=80
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_cta_primary",
            field=models.CharField(default="Ver agenda", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_cta_secondary",
            field=models.CharField(default="Contratar show", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_next_label",
            field=models.CharField(default="Próximo show", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_scroll_label",
            field=models.CharField(default="Role", max_length=40),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="nav_cta",
            field=models.CharField(default="Faça seu evento", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_tag_1",
            field=models.CharField(default="Humor de palco", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_tag_2",
            field=models.CharField(default="Turnê nacional", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_tag_3",
            field=models.CharField(default="Agenda {year}", max_length=60),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="hero_tag_4",
            field=models.CharField(default="Teatros lotados", max_length=60),
        ),
    ]
