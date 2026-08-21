from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


SEED_EMAIL = "gabrieleckaviski@gmail.com"

DEFAULTS = {
    "crm.message.received": (True, True, True, False, True),
    "crm.message.bounce": (True, True, True, False, True),
    "crm.message.sent": (True, True, False, False, False),
    "crm.lead.created": (True, True, True, False, True),
    "event.created": (True, True, False, False, True),
    "event.updated": (True, True, False, False, False),
    "event.deleted": (True, True, False, False, True),
    "form.updated": (True, True, False, False, False),
    "user.created": (True, False, False, False, True),
    "user.updated": (True, False, False, False, False),
    "user.deleted": (True, False, False, False, True),
    "configuration.updated": (True, False, False, False, True),
}


def migrate_notifications(apps, schema_editor):
    Notification = apps.get_model("core", "Notification")
    User = apps.get_model("accounts", "User")
    Preference = apps.get_model("core", "NotificationPreference")
    Recipient = apps.get_model("core", "NotificationRecipient")

    users = list(User.objects.filter(is_active=True))
    legacy = list(Notification.objects.filter(user__isnull=True))
    for old in legacy:
        if not users:
            old.dedupe_key = f"legacy:{old.pk}"
            old.event_type = old.event_type or "system.legacy"
            old.save(update_fields=["dedupe_key", "event_type"])
            continue
        for user in users:
            clone = Notification.objects.create(
                user=user,
                event_type=old.event_type or "system.legacy",
                dedupe_key=f"legacy:{old.pk}",
                title=old.title,
                message=old.message,
                link=old.link,
                is_read=old.is_read,
            )
            Notification.objects.filter(pk=clone.pk).update(created_at=old.created_at)
        old.delete()

    for key, flags in DEFAULTS.items():
        Preference.objects.get_or_create(
            event_type=key,
            defaults={
                "notify_admin": flags[0],
                "notify_gerente": flags[1],
                "notify_comercial": flags[2],
                "notify_visualizador": flags[3],
                "send_email": flags[4],
            },
        )

    Recipient.objects.get_or_create(
        email=SEED_EMAIL,
        defaults={"is_primary": True, "is_active": True},
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0016_extra_faq_items"),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="event_type",
            field=models.CharField(blank=True, db_index=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="notification",
            name="dedupe_key",
            field=models.CharField(blank=True, default="", max_length=180),
        ),
        migrations.CreateModel(
            name="NotificationPreference",
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
                ("event_type", models.CharField(max_length=80, unique=True)),
                ("notify_admin", models.BooleanField(default=True)),
                ("notify_gerente", models.BooleanField(default=False)),
                ("notify_comercial", models.BooleanField(default=False)),
                ("notify_visualizador", models.BooleanField(default=False)),
                ("send_email", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["event_type"]},
        ),
        migrations.CreateModel(
            name="NotificationRecipient",
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
                ("email", models.EmailField(max_length=254, unique=True)),
                ("is_primary", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-is_primary", "id"]},
        ),
        migrations.CreateModel(
            name="NotificationTemplate",
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
                ("event_type", models.CharField(max_length=80, unique=True)),
                ("subject", models.CharField(blank=True, max_length=200)),
                ("body", models.TextField(blank=True)),
                ("is_custom", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="NotificationDispatchLog",
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
                ("event_type", models.CharField(db_index=True, max_length=80)),
                ("dedupe_key", models.CharField(blank=True, max_length=180)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notification_dispatches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("in_app_user_ids", models.JSONField(blank=True, default=list)),
                ("email_to", models.JSONField(blank=True, default=list)),
                ("email_sent", models.BooleanField(default=False)),
                ("error", models.CharField(blank=True, max_length=400)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.RunPython(migrate_notifications, noop_reverse),
        migrations.AddConstraint(
            model_name="notification",
            constraint=models.UniqueConstraint(
                fields=("user", "event_type", "dedupe_key"),
                name="uniq_notif_user_event_dedupe",
            ),
        ),
    ]
