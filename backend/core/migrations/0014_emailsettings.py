from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0013_siteconfig_hero_cta_icons"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailSettings",
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
                ("smtp_host", models.CharField(blank=True, max_length=200)),
                ("smtp_port", models.PositiveIntegerField(blank=True, null=True)),
                ("smtp_user", models.CharField(blank=True, max_length=200)),
                ("smtp_password", models.CharField(blank=True, max_length=300)),
                ("smtp_from", models.CharField(blank=True, max_length=200)),
                ("imap_host", models.CharField(blank=True, max_length=200)),
                ("imap_port", models.PositiveIntegerField(blank=True, null=True)),
                ("imap_user", models.CharField(blank=True, max_length=200)),
                ("imap_password", models.CharField(blank=True, max_length=300)),
                ("imap_ssl", models.BooleanField(default=True)),
                ("imap_allow_self_signed", models.BooleanField(default=True)),
                ("team_to", models.EmailField(blank=True, max_length=254)),
                ("imap_uidvalidity", models.BigIntegerField(blank=True, null=True)),
                ("imap_last_uid", models.BigIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Configuração de e-mail"},
        ),
    ]
