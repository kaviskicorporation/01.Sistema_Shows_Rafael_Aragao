"""E-mails automáticos do formulário público + bolha na Troca de e-mails."""

from __future__ import annotations

import logging
import threading

from django.db import close_old_connections

from core.mailconf import get_smtp_config, smtp_ready
from core.mailer import MailSendError, send_email

from .models import Card, CardEmailMessage, Lead

logger = logging.getLogger(__name__)

CONFIRM_SUBJECT = "Recebemos sua solicitação — Rafael Aragão"


def _first_name(lead) -> str:
    raw = (getattr(lead, "name", "") or "").strip()
    return raw.split()[0] if raw else ""


def _confirm_subject(lead) -> str:
    nome = _first_name(lead)
    if nome:
        return f"{nome}, recebemos sua solicitação — Rafael Aragão"
    return CONFIRM_SUBJECT


def _confirm_body(lead) -> str:
    from django.utils import timezone

    nome = _first_name(lead)
    saudacao = f"Olá {nome}," if nome else "Olá,"
    agora = timezone.localtime().strftime("%d/%m/%Y às %H:%M")
    area = getattr(lead, "area_display", "") or ""
    extra = f" sobre {area}" if area else ""
    return (
        f"{saudacao}\n\n"
        f"Recebi o seu contato hoje ({agora}){extra}. "
        "A equipe responde por este mesmo e-mail em breve.\n\n"
        "Abraço,\n"
        "Rafael Aragão\n"
        "Rei dos Peão"
    )


def record_outbound(
    card,
    *,
    subject: str,
    body_text: str,
    to_email: str,
    message_id: str,
    body_html: str = "",
    kind: str = CardEmailMessage.BodyKind.TEXT,
    in_reply_to: str = "",
    sent_by=None,
) -> CardEmailMessage:
    smtp = get_smtp_config()
    return CardEmailMessage.objects.create(
        card=card,
        direction=CardEmailMessage.Direction.OUT,
        subject=(subject or "")[:300],
        body_text=body_text or "",
        body_html=body_html or "",
        body_kind=kind,
        from_email=smtp.from_email,
        to_email=to_email,
        message_id=(message_id or "")[:300],
        in_reply_to=(in_reply_to or "")[:300],
        sent_by=sent_by,
        is_bounce=False,
    )


def notify_new_lead(lead, card) -> None:
    """Confirmação ao cliente no fio do CRM. SMTP fora do request HTTP."""
    if not smtp_ready():
        logger.warning("SMTP indisponível — lead %s sem e-mails automáticos.", lead.pk)
        return

    lead_id = lead.pk
    card_id = card.pk

    def run():
        close_old_connections()
        try:
            lead_row = Lead.objects.get(pk=lead_id)
            card_row = Card.objects.get(pk=card_id)
            body = _confirm_body(lead_row)
            subject = _confirm_subject(lead_row)
            mid = send_email(
                to=lead_row.email,
                subject=subject,
                body_text=body,
            )
            record_outbound(
                card_row,
                subject=subject,
                body_text=body,
                to_email=lead_row.email,
                message_id=mid,
            )
        except MailSendError:
            logger.exception("Falha ao enviar confirmação para o lead %s", lead_id)
        except Exception:
            logger.exception("Falha no envio em segundo plano do lead %s", lead_id)
        finally:
            close_old_connections()

    threading.Thread(
        target=run, daemon=True, name=f"lead-mail-{lead_id}"
    ).start()
