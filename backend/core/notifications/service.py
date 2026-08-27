"""Disparo único: evento → matriz → in-app por usuário + e-mail externo."""

from __future__ import annotations

import logging
from typing import Any

from django.db import DatabaseError, IntegrityError, close_old_connections, transaction
from django.utils import timezone

from .events import EventSpec, get_spec
from .mail import admin_url, mailbox_addresses, send_notification_email
from .placeholders import actor_label, render

logger = logging.getLogger(__name__)

ROLE_FIELDS = {
    "admin": "notify_admin",
    "gerente": "notify_gerente",
    "comercial": "notify_comercial",
    "visualizador": "notify_visualizador",
}


def emit_safe(
    event_type: str,
    *,
    actor=None,
    payload: dict[str, Any] | None = None,
    dedupe_key: str = "",
    link: str = "",
    title: str = "",
    message: str = "",
) -> None:
    try:
        emit(
            event_type,
            actor=actor,
            payload=payload,
            dedupe_key=dedupe_key,
            link=link,
            title=title,
            message=message,
        )
    except Exception:
        logger.exception("Falha ao emitir notificação %s", event_type)


def emit(
    event_type: str,
    *,
    actor=None,
    payload: dict[str, Any] | None = None,
    dedupe_key: str = "",
    link: str = "",
    title: str = "",
    message: str = "",
) -> None:
    spec = get_spec(event_type)
    if spec is None:
        logger.warning("Evento de notificação desconhecido: %s", event_type)
        return

    from core.models import (
        Notification,
        NotificationDispatchLog,
        NotificationTemplate,
    )
    from django.contrib.auth import get_user_model

    ensure_preferences()

    User = get_user_model()
    pref = _preference_for(spec)
    values = _context(spec, actor, payload)
    target_link = (link or "/admin")[:200]
    values["link"] = admin_url(target_link)
    in_title = (title or render(spec.in_app_title, spec, values)).strip()[:160]
    in_message = (message or render(spec.in_app_message, spec, values)).strip()[:300]
    key = (dedupe_key or f"{event_type}:{timezone.now().timestamp()}").strip()[:180]

    roles = [
        role
        for role, field in ROLE_FIELDS.items()
        if getattr(pref, field, False)
    ]
    users = list(
        User.objects.filter(is_active=True, role__in=roles).only(
            "id", "role", "username", "first_name", "last_name"
        )
    )
    if spec.skip_actor and actor is not None:
        actor_id = getattr(actor, "pk", None)
        users = [u for u in users if u.pk != actor_id]

    notified_ids: list[int] = []
    for user in users:
        created = _create_in_app(
            Notification,
            user=user,
            event_type=event_type,
            dedupe_key=key,
            title=in_title,
            message=in_message,
            link=target_link,
        )
        if created:
            notified_ids.append(user.pk)

    email_to, error = _resolve_email_to(pref)
    subject_tpl = spec.default_subject
    body_tpl = spec.default_body
    if email_to:
        subject_tpl, body_tpl = _template_text(spec, NotificationTemplate)

    log = NotificationDispatchLog.objects.create(
        event_type=event_type,
        dedupe_key=key,
        actor=actor if getattr(actor, "pk", None) else None,
        in_app_user_ids=notified_ids,
        email_to=email_to,
        email_sent=False,
        error=error,
    )

    if not email_to:
        logger.warning(
            "Aviso %s sem destinatário de e-mail (%s)", event_type, error or "vazio"
        )
        return

    payload_mail = dict(
        log_id=log.pk,
        event_type=event_type,
        spec=spec,
        subject_tpl=subject_tpl,
        body_tpl=body_tpl,
        values=dict(values),
        link=target_link,
        addresses=list(email_to),
    )

    def start_mail():
        _deliver_notification_emails(**payload_mail)

    transaction.on_commit(start_mail)


def ensure_preferences() -> None:
    from core.models import NotificationPreference, NotificationRecipient
    from .events import all_specs

    existing = set(NotificationPreference.objects.values_list("event_type", flat=True))
    primary_id = (
        NotificationRecipient.objects.filter(is_primary=True, is_active=True)
        .values_list("id", flat=True)
        .first()
    )
    if primary_id is None:
        primary_id = (
            NotificationRecipient.objects.filter(is_active=True)
            .values_list("id", flat=True)
            .first()
        )
    to_create = []
    for spec in all_specs():
        if spec.key in existing:
            continue
        ids = [primary_id] if primary_id else []
        to_create.append(
            NotificationPreference(
                event_type=spec.key,
                notify_admin=spec.notify_admin,
                notify_gerente=spec.notify_gerente,
                notify_comercial=spec.notify_comercial,
                notify_visualizador=spec.notify_visualizador,
                send_email=bool(ids),
                email_recipient_ids=ids,
            )
        )
    if to_create:
        NotificationPreference.objects.bulk_create(to_create)
    _backfill_empty_recipients(primary_id)
    if primary_id:
        _add_recipient_to_prefs(primary_id)


def subscribe_recipient(recipient_id: int) -> None:
    """Associa o destinatário a todos os eventos — e-mail principal recebe tudo."""
    if not recipient_id:
        return
    ensure_preferences()
    _add_recipient_to_prefs(recipient_id)


def _add_recipient_to_prefs(recipient_id: int) -> None:
    from core.models import NotificationPreference

    for pref in NotificationPreference.objects.all():
        ids = _parse_ids(getattr(pref, "email_recipient_ids", None))
        if recipient_id in ids:
            continue
        ids.append(recipient_id)
        pref.email_recipient_ids = ids
        pref.send_email = True
        pref.save(update_fields=["email_recipient_ids", "send_email"])


def _backfill_empty_recipients(primary_id: int | None) -> None:
    if not primary_id:
        return
    from core.models import NotificationPreference, NotificationRecipient

    valid = set(
        NotificationRecipient.objects.filter(is_active=True).values_list("id", flat=True)
    )
    for pref in NotificationPreference.objects.all():
        ids = [i for i in _parse_ids(pref.email_recipient_ids) if i in valid]
        if ids:
            if ids != _parse_ids(pref.email_recipient_ids):
                pref.email_recipient_ids = ids
                pref.send_email = True
                pref.save(update_fields=["email_recipient_ids", "send_email"])
            continue
        pref.email_recipient_ids = [primary_id]
        pref.send_email = True
        pref.save(update_fields=["email_recipient_ids", "send_email"])


def _preference_for(spec: EventSpec):
    from core.models import NotificationPreference, NotificationRecipient

    primary_id = (
        NotificationRecipient.objects.filter(is_primary=True, is_active=True)
        .values_list("id", flat=True)
        .first()
    )
    ids = [primary_id] if primary_id else []
    pref, created = NotificationPreference.objects.get_or_create(
        event_type=spec.key,
        defaults={
            "notify_admin": spec.notify_admin,
            "notify_gerente": spec.notify_gerente,
            "notify_comercial": spec.notify_comercial,
            "notify_visualizador": spec.notify_visualizador,
            "send_email": bool(ids),
            "email_recipient_ids": ids,
        },
    )
    if created:
        return pref
    chosen = _parse_ids(pref.email_recipient_ids)
    if not chosen and primary_id:
        pref.email_recipient_ids = [primary_id]
        pref.send_email = True
        pref.save(update_fields=["email_recipient_ids", "send_email"])
    return pref


def _parse_ids(raw) -> list[int]:
    ids: list[int] = []
    for value in raw or []:
        if isinstance(value, bool):
            continue
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if n > 0 and n not in ids:
            ids.append(n)
    return ids


def _resolve_email_to(pref) -> tuple[list[str], str]:
    """Destinatários do evento; se a matriz estiver vazia/obsoleta, usa o principal."""
    from core.models import NotificationRecipient

    active = list(NotificationRecipient.objects.filter(is_active=True))
    by_id = {row.pk: row for row in active}
    chosen = [by_id[i] for i in _parse_ids(getattr(pref, "email_recipient_ids", None)) if i in by_id]
    if not chosen:
        primary = next((row for row in active if row.is_primary), None)
        chosen = [primary] if primary else list(active)

    blocked = mailbox_addresses()
    email_to: list[str] = []
    for row in chosen:
        addr = (row.email or "").strip().lower()
        if not addr or addr in blocked or addr in email_to:
            continue
        email_to.append(addr)

    if email_to:
        return email_to, ""
    if not active:
        return [], "Nenhum destinatário ativo cadastrado."
    return [], "Destinatários coincidem com a mailbox do CRM — aviso externo ignorado."


def _template_text(spec: EventSpec, TemplateModel):
    row = TemplateModel.objects.filter(event_type=spec.key, is_custom=True).first()
    if row:
        return row.subject or spec.default_subject, row.body or spec.default_body
    return spec.default_subject, spec.default_body


def _context(spec: EventSpec, actor, payload: dict[str, Any] | None) -> dict[str, str]:
    now = timezone.localtime()
    values = {
        "actorName": actor_label(actor),
        "date": now.strftime("%d/%m/%Y às %H:%M"),
        "link": "",
    }
    for key, raw in (payload or {}).items():
        if raw is None:
            continue
        values[str(key)] = str(raw)
    for key in spec.placeholders:
        values.setdefault(key, "")
    return values


def _create_in_app(Notification, *, user, event_type, dedupe_key, title, message, link) -> bool:
    try:
        with transaction.atomic():
            Notification.objects.create(
                user=user,
                event_type=event_type,
                dedupe_key=dedupe_key,
                title=title[:160],
                message=(message or "")[:300],
                link=link[:200],
            )
        return True
    except (IntegrityError, DatabaseError):
        return False


def _deliver_notification_emails(
    *,
    log_id: int,
    event_type: str,
    spec: EventSpec,
    subject_tpl: str,
    body_tpl: str,
    values: dict[str, str],
    link: str,
    addresses: list[str],
) -> None:
    close_old_connections()
    sent_any = False
    errors: list[str] = []
    try:
        for addr in addresses:
            try:
                send_notification_email(
                    to=addr,
                    spec=spec,
                    subject_tpl=subject_tpl,
                    body_tpl=body_tpl,
                    values=values,
                    link=link,
                )
                sent_any = True
            except Exception as exc:
                logger.exception(
                    "Falha ao enviar aviso %s para %s", event_type, addr
                )
                errors.append(str(exc)[:180])
        from core.models import NotificationDispatchLog

        NotificationDispatchLog.objects.filter(pk=log_id).update(
            email_sent=sent_any,
            error="; ".join(errors)[:400],
        )
        if sent_any:
            logger.info("Aviso %s enviado para %s", event_type, ", ".join(addresses))
        elif errors:
            logger.error("Aviso %s não enviado: %s", event_type, "; ".join(errors))
    except Exception:
        logger.exception("Falha no envio de %s", event_type)
    finally:
        close_old_connections()
