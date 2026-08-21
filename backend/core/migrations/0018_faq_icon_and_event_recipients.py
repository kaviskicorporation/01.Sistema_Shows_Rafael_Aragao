from django.db import migrations, models


FAQ_ICONS_BY_QUESTION = {
    "Como faço para contratar o Rafael Aragão para um evento?": "handshake",
    "Vocês atendem eventos corporativos, prefeituras e teatros?": "building-2",
    "Como acompanho as datas da turnê?": "calendar-days",
    "Qual o prazo ideal para solicitar um show?": "clock",
    "Como funciona cachê e forma de pagamento?": "wallet",
    "Posso contratar um evento fechado ou particular?": "users",
    "O show inclui equipe e estrutura de palco?": "map-pin",
    "O que acontece depois que eu envio o formulário?": "mic-2",
}

FALLBACK_BY_ORDER = [
    "handshake",
    "building-2",
    "calendar-days",
    "clock",
    "wallet",
    "users",
    "map-pin",
    "mic-2",
]


def fill_defaults(apps, schema_editor):
    FaqItem = apps.get_model("core", "FaqItem")
    for item in FaqItem.objects.all().order_by("order", "id"):
        icon = FAQ_ICONS_BY_QUESTION.get(item.question or "")
        if not icon:
            icon = FALLBACK_BY_ORDER[item.order] if item.order < len(FALLBACK_BY_ORDER) else "help-circle"
        item.icon = icon
        item.save(update_fields=["icon"])

    Preference = apps.get_model("core", "NotificationPreference")
    Recipient = apps.get_model("core", "NotificationRecipient")
    primary = Recipient.objects.filter(is_primary=True).first()
    others = list(
        Recipient.objects.filter(is_active=True).exclude(
            pk=primary.pk if primary else 0
        )
    )
    for pref in Preference.objects.all():
        ids = []
        if primary:
            ids.append(primary.pk)
        if pref.send_email:
            for row in others:
                if row.pk not in ids:
                    ids.append(row.pk)
        pref.email_recipient_ids = ids
        pref.send_email = bool(ids)
        pref.save(update_fields=["email_recipient_ids", "send_email"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0017_platform_notifications"),
    ]

    operations = [
        migrations.AddField(
            model_name="faqitem",
            name="icon",
            field=models.CharField(blank=True, default="help-circle", max_length=40),
        ),
        migrations.AddField(
            model_name="notificationpreference",
            name="email_recipient_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(fill_defaults, noop),
    ]
