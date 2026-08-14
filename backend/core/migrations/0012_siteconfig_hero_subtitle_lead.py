from django.db import migrations, models


def split_hero_subtitle(apps, schema_editor):
    SiteConfig = apps.get_model("core", "SiteConfig")
    for cfg in SiteConfig.objects.all():
        raw = (cfg.hero_subtitle or "").strip()
        for sep in ("—", "–", "-"):
            if sep in raw:
                left, _, right = raw.partition(sep)
                lead = left.strip()
                line = right.strip()
                if lead and line:
                    # Evita repetir o badge "Ao vivo" se já era Humorista etc.
                    cfg.hero_subtitle_lead = lead
                    cfg.hero_subtitle = line
                    cfg.save(update_fields=["hero_subtitle_lead", "hero_subtitle"])
                break


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_siteconfig_nav_menu"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="hero_subtitle_lead",
            field=models.CharField(
                blank=True, default="Espetáculo", max_length=80
            ),
        ),
        migrations.AlterField(
            model_name="siteconfig",
            name="hero_subtitle",
            field=models.CharField(
                default="O artista que lota teatros pelo Brasil",
                max_length=300,
            ),
        ),
        migrations.RunPython(split_hero_subtitle, migrations.RunPython.noop),
    ]
