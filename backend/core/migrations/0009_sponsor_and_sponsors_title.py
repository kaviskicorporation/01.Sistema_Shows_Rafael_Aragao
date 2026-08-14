from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_siteconfig_contact_section"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="sponsors_title",
            field=models.CharField(
                blank=True, default="Patrocinadores", max_length=80
            ),
        ),
        migrations.CreateModel(
            name="Sponsor",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=120)),
                (
                    "text_mark",
                    models.CharField(
                        blank=True,
                        help_text="Texto em destaque quando não há logo (ex.: CDC).",
                        max_length=40,
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        blank=True, null=True, upload_to="sponsors/"
                    ),
                ),
                (
                    "image_url",
                    models.CharField(
                        blank=True,
                        help_text="URL/caminho do logo (alternativa ao upload).",
                        max_length=500,
                    ),
                ),
                ("link", models.CharField(blank=True, max_length=500)),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Patrocinador",
                "verbose_name_plural": "Patrocinadores",
                "ordering": ["order", "id"],
            },
        ),
    ]
