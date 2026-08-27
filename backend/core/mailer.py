"""Envio SMTP real via get_smtp_config()."""

from __future__ import annotations

import logging
import smtplib
import ssl
import threading
import uuid
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

from django.conf import settings

from .mailconf import get_smtp_config, smtp_ready

logger = logging.getLogger(__name__)
_smtp_lock = threading.Lock()


class MailSendError(Exception):
    pass


def _new_message_id(from_email: str) -> str:
    domain = "local"
    if "@" in (from_email or ""):
        domain = from_email.rsplit("@", 1)[-1].strip() or domain
    return make_msgid(idstring=uuid.uuid4().hex[:12], domain=domain)


def send_email(
    *,
    to: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
    attachments: list[tuple[str, bytes, str]] | None = None,
    in_reply_to: str = "",
    references: str = "",
    message_id: str = "",
    extra_headers: dict | None = None,
) -> str:
    """Envia e-mail. attachments = [(filename, content, mime)]. Retorna Message-ID."""
    if not to:
        raise MailSendError("Destinatário vazio.")
    if not smtp_ready():
        raise MailSendError("SMTP não configurado.")

    cfg = get_smtp_config()
    mid = message_id or _new_message_id(cfg.from_email)

    sender_name = getattr(settings, "MAIL_SENDER_NAME", "") or ""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = (
        formataddr((sender_name, cfg.from_email)) if sender_name else cfg.from_email
    )
    msg["To"] = to
    msg["Reply-To"] = cfg.from_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = mid
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to
    if references:
        msg["References"] = references

    # HTML só entra quando o painel pediu HTML. Forçar multipart em todo
    # envio faz o Gmail tratar a mensagem como modelo de disparo.
    msg.set_content(body_text or " ")
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    # Cabeçalho único por mensagem — o Gmail agrupa "iguais" como spam.
    msg["X-Entity-Ref-ID"] = uuid.uuid4().hex
    reserved = {
        "from",
        "to",
        "subject",
        "date",
        "message-id",
        "reply-to",
        "in-reply-to",
        "references",
    }
    for key, value in (extra_headers or {}).items():
        name = str(key or "").strip()
        val = str(value or "").strip()
        if not name or not val or name.lower() in reserved:
            continue
        msg[name] = val

    for name, content, mime in attachments or []:
        main, _, sub = (mime or "application/octet-stream").partition("/")
        if not sub:
            main, sub = "application", "octet-stream"
        filename = Path(name).name or "anexo"
        msg.add_attachment(
            content,
            maintype=main,
            subtype=sub,
            filename=filename,
        )

    context = ssl.create_default_context()
    if getattr(settings, "SMTP_ALLOW_SELF_SIGNED", True):
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    try:
        with _smtp_lock:
            with smtplib.SMTP(
                cfg.host,
                cfg.port,
                timeout=30,
                local_hostname=cfg.host,
            ) as smtp:
                smtp.ehlo()
                if cfg.use_tls:
                    smtp.starttls(context=context)
                    smtp.ehlo()
                smtp.login(cfg.user, cfg.password)
                refused = smtp.send_message(msg, from_addr=cfg.user, to_addrs=[to])
                if refused:
                    raise MailSendError("Servidor recusou o destinatário.")
    except MailSendError:
        raise
    except smtplib.SMTPAuthenticationError as exc:
        logger.exception("Falha de autenticação SMTP")
        raise MailSendError(
            "O servidor de e-mail recusou o usuário/senha configurados."
        ) from exc
    except smtplib.SMTPRecipientsRefused as exc:
        logger.exception("Destinatário recusado: %s", to)
        raise MailSendError(f"O servidor recusou o destinatário {to}.") from exc
    except smtplib.SMTPResponseException as exc:
        detail = (exc.smtp_error or b"").decode("utf-8", "replace") if isinstance(
            exc.smtp_error, (bytes, bytearray)
        ) else str(exc.smtp_error or "")
        logger.exception("Erro SMTP %s para %s", exc.smtp_code, to)
        raise MailSendError(f"Erro SMTP {exc.smtp_code}: {detail}".strip()) from exc
    except OSError as exc:
        logger.exception("Falha de conexão SMTP com %s:%s", cfg.host, cfg.port)
        raise MailSendError(
            f"Não foi possível conectar ao servidor de envio ({exc.__class__.__name__})."
        ) from exc

    logger.info("E-mail enviado para %s assunto=%s", to, subject)
    return mid
