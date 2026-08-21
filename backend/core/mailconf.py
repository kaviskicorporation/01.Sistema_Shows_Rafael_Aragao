"""Resolver único SMTP/IMAP: override completo do banco ou fallback do .env."""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    user: str
    password: str
    from_email: str
    use_tls: bool
    is_override: bool


@dataclass(frozen=True)
class ImapConfig:
    host: str
    port: int
    user: str
    password: str
    ssl: bool
    allow_self_signed: bool
    is_override: bool


def _settings_row():
    from .models import EmailSettings

    return EmailSettings.load()


def get_smtp_config() -> SmtpConfig:
    row = _settings_row()
    if row.smtp_package_complete():
        return SmtpConfig(
            host=row.smtp_host.strip(),
            port=int(row.smtp_port),
            user=row.smtp_user.strip(),
            password=row.smtp_password,
            from_email=row.smtp_from.strip(),
            use_tls=True,
            is_override=True,
        )
    return SmtpConfig(
        host=settings.SMTP_HOST,
        port=int(settings.SMTP_PORT or 587),
        user=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        from_email=settings.SMTP_FROM or settings.SMTP_USER,
        use_tls=bool(settings.SMTP_USE_TLS),
        is_override=False,
    )


def get_imap_config() -> ImapConfig:
    row = _settings_row()
    if row.imap_package_complete():
        return ImapConfig(
            host=row.imap_host.strip(),
            port=int(row.imap_port),
            user=row.imap_user.strip(),
            password=row.imap_password,
            ssl=bool(row.imap_ssl),
            allow_self_signed=bool(row.imap_allow_self_signed),
            is_override=True,
        )
    return ImapConfig(
        host=settings.IMAP_HOST,
        port=int(settings.IMAP_PORT or 993),
        user=settings.IMAP_USER,
        password=settings.IMAP_PASSWORD,
        ssl=bool(settings.IMAP_SSL),
        allow_self_signed=bool(settings.IMAP_ALLOW_SELF_SIGNED),
        is_override=False,
    )


def smtp_ready() -> bool:
    cfg = get_smtp_config()
    return bool(cfg.host and cfg.user and cfg.password and cfg.from_email)


def imap_ready() -> bool:
    cfg = get_imap_config()
    return bool(cfg.host and cfg.user and cfg.password)
