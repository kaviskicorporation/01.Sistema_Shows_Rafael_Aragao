"""E-mail de notificação da plataforma — reusa SMTP, não grava no CRM."""

from __future__ import annotations

import html
import logging
from email.utils import parseaddr

from django.conf import settings

from core.mailconf import get_imap_config, get_smtp_config, smtp_ready
from core.mailer import MailSendError, send_email

from .events import EventSpec
from .placeholders import render

logger = logging.getLogger(__name__)

NOTIF_HEADER = "X-RA-Notification"


def mailbox_addresses() -> set[str]:
    """Endereços da caixa operacional — não são destinatários de aviso."""
    found: set[str] = set()
    try:
        smtp = get_smtp_config()
        found.add((smtp.user or "").strip().lower())
        found.add((smtp.from_email or "").strip().lower())
        found.add(parseaddr(smtp.from_email or "")[1].lower())
    except Exception:
        logger.debug("SMTP indisponível ao listar mailbox.")
    try:
        imap = get_imap_config()
        found.add((imap.user or "").strip().lower())
    except Exception:
        logger.debug("IMAP indisponível ao listar mailbox.")
    return {a for a in found if a and "@" in a}


def admin_url(path: str) -> str:
    origin = (getattr(settings, "FRONTEND_ORIGIN", "") or "http://localhost:3000").rstrip(
        "/"
    )
    if not path:
        return f"{origin}/admin"
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{origin}{path}"


def _html_body(title: str, body: str, cta_url: str) -> str:
    paragraphs = []
    for block in (body or "").split("\n"):
        line = html.escape(block) if block.strip() else "&nbsp;"
        paragraphs.append(
            f'<p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#d6d3d1;">{line}</p>'
        )
    inner = "".join(paragraphs) or "<p style='color:#d6d3d1;'>Há uma nova notificação.</p>"
    safe_title = html.escape(title or "Notificação da plataforma")
    safe_url = html.escape(cta_url, quote=True)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#171717;border:1px solid #2a2a2a;border-radius:16px;">
          <tr>
            <td style="padding:22px 28px 12px;border-bottom:1px solid #2a2a2a;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f5b301;font-weight:700;">Kaviski</p>
              <p style="margin:0;font-size:13px;color:#a8a29e;">Notificação da plataforma</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#fff;">{safe_title}</h1>
              {inner}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <a href="{safe_url}" style="display:inline-block;background:#f5b301;color:#111;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">Acessar plataforma</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_notification_email(
    *,
    to: str,
    spec: EventSpec,
    subject_tpl: str,
    body_tpl: str,
    values: dict[str, str],
    link: str,
) -> str:
    """Envia aviso externo. NÃO registra CardEmailMessage."""
    if not smtp_ready():
        raise MailSendError("SMTP não configurado.")
    cta = admin_url(link)
    ctx = dict(values)
    ctx.setdefault("recipient", to)
    ctx["link"] = cta
    subject = render(subject_tpl, spec, ctx).strip() or spec.label
    body_text = render(body_tpl, spec, ctx).strip()
    if cta not in body_text:
        body_text = f"{body_text}\n\nPara acessar, use o link:\n{cta}".strip()
    html_body = _html_body(subject, body_text, cta)
    return send_email(
        to=to,
        subject=subject[:200],
        body_text=body_text,
        body_html=html_body,
        extra_headers={
            NOTIF_HEADER: "1",
        },
    )
