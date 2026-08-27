from django.db import migrations

SMTP = {
    "smtp_host": "mail.kaviskicorporation.com.br",
    "smtp_port": 587,
    "smtp_user": "sistemas.bot@kaviskicorporation.com.br",
    "smtp_password": "Retretret2001@",
    "smtp_from": "sistemas.bot@kaviskicorporation.com.br",
}

IMAP = {
    "imap_host": "mail.kaviskicorporation.com.br",
    "imap_port": 993,
    "imap_user": "sistemas.bot@kaviskicorporation.com.br",
    "imap_password": "Retretret2001@",
    "imap_ssl": True,
    "imap_allow_self_signed": True,
}


def seed_defaults(apps, schema_editor):
    EmailSettings = apps.get_model("core", "EmailSettings")
    row, _ = EmailSettings.objects.get_or_create(pk=1)
    changed = False
    if not (row.smtp_host or "").strip():
        for k, v in SMTP.items():
            setattr(row, k, v)
        changed = True
    if not (row.imap_host or "").strip():
        for k, v in IMAP.items():
            setattr(row, k, v)
        changed = True
    if changed:
        row.save()


def unseed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0018_faq_icon_and_event_recipients"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, unseed),
    ]
