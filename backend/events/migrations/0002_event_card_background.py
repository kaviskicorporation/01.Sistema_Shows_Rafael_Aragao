from django.db import migrations, models


def apply_defaults(apps, schema_editor):
    Event = apps.get_model("events", "Event")
    # Fundo do topo: sem arte “Rei dos Peão” em todos os shows
    Event.objects.all().update(
        banner_url="",
        card_bg_preset="chair",
    )
    # Limpa ImageField se apontava só para URL antiga (banner file fica)
    # banner_url já limpo; card padrão = cadeira


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="event",
            name="card_bg_preset",
            field=models.CharField(
                choices=[
                    ("chair", "Foto na cadeira (padrão)"),
                    ("texture_soft", "Textura suave"),
                    ("texture_grain", "Textura grain"),
                    ("texture_mesh", "Textura mesh"),
                    ("texture_lines", "Linhas diagonais"),
                    ("gradient_gold", "Gradiente ouro"),
                    ("gradient_ember", "Gradiente brasa"),
                    ("gradient_night", "Gradiente noite"),
                    ("gradient_forest", "Gradiente floresta"),
                    ("gradient_violet", "Gradiente violeta"),
                    ("solid", "Cor sólida"),
                    ("custom_image", "Imagem personalizada"),
                ],
                default="chair",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="card_bg_color",
            field=models.CharField(
                blank=True,
                default="#121212",
                help_text="Usado quando o preset é 'solid'.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="card_bg_image",
            field=models.ImageField(
                blank=True, null=True, upload_to="events/cards/"
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="card_bg_image_url",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.RunPython(apply_defaults, noop),
    ]
