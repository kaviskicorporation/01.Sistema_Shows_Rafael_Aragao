"""Disparo único: evento → matriz → in-app por usuário + e-mail externo."""

from __future__ import annotations

import logging
import threading
from typing import Any

from django.db import DatabaseError, IntegrityError, close_old_connections, transaction
from django.utils import timezone

from .events import EventSpec, get_spec
from .mail import mailbox_addresses, send_notification_email
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
        NotificationRecipient,
        NotificationTemplate,
    )
    from django.contrib.auth import get_user_model

    User = get_user_model()
    pref = _preference_for(spec)
    values = _context(spec, actor, payload)
    in_title = (title or render(spec.in_app_title, spec, values)).strip()[:160]
    in_message = (message or render(spec.in_app_message, spec, values)).strip()[:300]
    key = (dedupe_key or f"{event_type}:{timezone.now().timestamp()}").strip()[:180]
    target_link = (link or "/admin")[:200]

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

    email_to: list[str] = []
    error = ""
    subject_tpl = spec.default_subject
    body_tpl = spec.default_body
    chosen_ids: list[int] = []
    for raw in getattr(pref, "email_recipient_ids", None) or []:
        if isinstance(raw, bool):
            continue
        try:
            n = int(raw)
        except (TypeError, ValueError):
            continue
        if n > 0 and n not in chosen_ids:
            chosen_ids.append(n)
    recipients = []
    if chosen_ids:
        found = {
            row.pk: row
            for row in NotificationRecipient.objects.filter(
                is_active=True, pk__in=chosen_ids
            )
        }
        recipients = [found[i] for i in chosen_ids if i in found]
    if recipients:
        blocked = mailbox_addresses()
        for row in recipients:
            addr = (row.email or "").strip().lower()
            if not addr or addr in blocked:
                continue
            if addr in email_to:
                continue
            email_to.append(addr)
        subject_tpl, body_tpl = _template_text(spec, NotificationTemplate)
        if not email_to:
            error = "Destinatários coincidem com a mailbox do CRM — aviso externo ignorado."
    elif chosen_ids:
        error = "Nenhum destinatário ativo para este evento."

    log = NotificationDispatchLog.objects.create(
        event_type=event_type,
        dedupe_key=key,
        actor=actor if getattr(actor, "pk", None) else None,
        in_app_user_ids=notified_ids,
        email_to=email_to,
        email_sent=False,
        error=error,
    )
    close_old_connections()

    if email_to:
        def start_mail():
            _queue_notification_emails(
                log_id=log.pk,
                event_type=event_type,
                spec=spec,
                subject_tpl=subject_tpl,
                body_tpl=body_tpl,
                values=dict(values),
                link=target_link,
                addresses=list(email_to),
            )

        transaction.on_commit(start_mail)


def ensure_preferences() -> None:
    from core.models import NotificationPreference, NotificationRecipient
    from .events import all_specs

    existing = set(NotificationPreference.objects.values_list("event_type", flat=True))
    primary_id = (
        NotificationRecipient.objects.filter(is_primary=True)
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


def _preference_for(spec: EventSpec):
    from core.models import NotificationPreference, NotificationRecipient

    primary_id = (
        NotificationRecipient.objects.filter(is_primary=True)
        .values_list("id", flat=True)
        .first()
    )
    ids = [primary_id] if primary_id else []
    pref, _ = NotificationPreference.objects.get_or_create(
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
    return pref


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


def _queue_notification_emails(
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
    def run():
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
        except Exception:
            logger.exception("Falha no envio em segundo plano de %s", event_type)
        finally:
            close_old_connections()

    threading.Thread(
        target=run, daemon=False, name=f"notif-mail-{event_type}"
    ).start()
