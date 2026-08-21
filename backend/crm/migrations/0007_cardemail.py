import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("crm", "0006_cardnote_pin_updated"),
    ]

    operations = [
        migrations.CreateModel(
            name="CardEmailMessage",
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
                (
                    "direction",
                    models.CharField(
                        choices=[("out", "Enviado"), ("in", "Recebido")],
                        max_length=8,
                    ),
                ),
                ("subject", models.CharField(blank=True, max_length=300)),
                ("body_text", models.TextField(blank=True)),
                ("body_html", models.TextField(blank=True)),
                (
                    "body_kind",
                    models.CharField(
                        choices=[("text", "Texto"), ("html", "HTML")],
                        default="text",
                        max_length=8,
                    ),
                ),
                ("from_email", models.EmailField(max_length=254)),
                ("to_email", models.EmailField(max_length=254)),
                (
                    "message_id",
                    models.CharField(blank=True, db_index=True, max_length=300),
                ),
                ("in_reply_to", models.CharField(blank=True, max_length=300)),
                (
                    "imap_uid",
                    models.CharField(blank=True, db_index=True, max_length=40),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "card",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="emails",
                        to="crm.card",
                    ),
                ),
                (
                    "sent_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="card_emails",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="CardEmailAttachment",
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
                ("file", models.FileField(upload_to="crm/email/")),
                ("name", models.CharField(blank=True, max_length=200)),
                ("content_type", models.CharField(blank=True, max_length=120)),
                (
                    "message",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="crm.cardemailmessage",
                    ),
                ),
            ],
        ),
    ]
