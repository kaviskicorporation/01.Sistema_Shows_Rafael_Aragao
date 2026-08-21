"""Ouvinte IMAP: agrupa respostas no fio do lead cujo e-mail casa com From/Reply-To."""

from __future__ import annotations

import email
import imaplib
import logging
import re
import ssl
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime, parseaddr

from django.core.files.base import ContentFile
from django.utils import timezone

from core.mailconf import get_imap_config, imap_ready
from core.models import EmailSettings

from .models import (
    Card,
    CardEmailAttachment,
    CardEmailMessage,
    CardHistory,
    Lead,
)

logger = logging.getLogger(__name__)


def _decode_hdr(raw) -> str:
    if not raw:
        return ""
    try:
        return str(make_header(decode_header(raw)))
    except Exception:
        return str(raw)


def _addr(raw: str) -> str:
    _, addr = parseaddr(raw or "")
    return (addr or "").strip().lower()


def _body_parts(msg) -> tuple[str, str]:
    text, html = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")
            if "attachment" in disp.lower():
                continue
            payload = part.get_payload(decode=True) or b""
            charset = part.get_content_charset() or "utf-8"
            try:
                decoded = payload.decode(charset, errors="replace")
            except Exception:
                decoded = payload.decode("utf-8", errors="replace")
            if ctype == "text/plain" and not text:
                text = decoded
            elif ctype == "text/html" and not html:
                html = decoded
    else:
        payload = msg.get_payload(decode=True) or b""
        charset = msg.get_content_charset() or "utf-8"
        decoded = payload.decode(charset, errors="replace")
        if msg.get_content_type() == "text/html":
            html = decoded
        else:
            text = decoded
    return text.strip(), html.strip()


def _attachments(msg) -> list[tuple[str, bytes, str]]:
    out = []
    if not msg.is_multipart():
        return out
    for part in msg.walk():
        disp = str(part.get("Content-Disposition") or "")
        filename = part.get_filename()
        if "attachment" not in disp.lower() and not filename:
            continue
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        name = _decode_hdr(filename) or "anexo"
        ctype = part.get_content_type() or "application/octet-stream"
        out.append((name, payload, ctype))
    return out


def _norm_mid(raw: str) -> str:
    return (raw or "").strip().strip("<>").strip()


def _bounce_report(msg) -> tuple[str, str] | None:
    """Se a mensagem for aviso de falha de entrega, devolve (destinatário, motivo)."""
    sender = _addr(msg.get("From", ""))
    local = sender.split("@", 1)[0] if sender else ""
    content_type = str(msg.get("Content-Type") or "").lower()
    is_report = (
        msg.get_content_type() == "multipart/report"
        or "report-type=delivery-status" in content_type
    )
    if not is_report and local not in {"mailer-daemon", "postmaster"}:
        return None

    recipient, reason = "", ""
    for part in msg.walk():
        if part.get_content_type() != "message/delivery-status":
            continue
        block = (part.get_payload(decode=True) or b"").decode("utf-8", "replace")
        for line in block.splitlines():
            low = line.lower()
            if not recipient and low.startswith(
                ("final-recipient:", "original-recipient:")
            ):
                recipient = _addr(line.split(";", 1)[-1])
            elif low.startswith("diagnostic-code:"):
                reason = line.split(":", 1)[-1].split(";", 1)[-1].strip()
            elif not reason and low.startswith("status:"):
                reason = f"código {line.split(':', 1)[-1].strip()}"

    if not recipient or not reason:
        text, _ = _body_parts(msg)
        hit = re.search(r"<([^>@\s]+@[^>\s]+)>:\s*(.+?)(?:\n\s*\n|\Z)", text, re.S)
        if hit:
            recipient = recipient or _addr(hit.group(1))
            reason = reason or " ".join(hit.group(2).split())

    if not recipient:
        return None
    return recipient, reason or "O servidor de destino recusou a mensagem."


def _card_for_recipient(addr: str):
    if not addr:
        return None
    lead = Lead.objects.filter(email__iexact=addr).order_by("-created_at").first()
    if lead:
        try:
            return lead.card
        except Card.DoesNotExist:
            pass
    hit = (
        CardEmailMessage.objects.filter(to_email__iexact=addr)
        .select_related("card__lead")
        .order_by("-created_at")
        .first()
    )
    return hit.card if hit else None


def _find_card(from_email: str, reply_to: str, in_reply_to: str):
    mid = _norm_mid(in_reply_to)
    if mid:
        hit = (
            CardEmailMessage.objects.filter(message_id__icontains=mid)
            .select_related("card__lead")
            .first()
        )
        if hit:
            return hit.card

    for addr in (from_email, reply_to):
        if not addr:
            continue
        lead = Lead.objects.filter(email__iexact=addr).order_by("-created_at").first()
        if lead:
            try:
                return lead.card
            except Card.DoesNotExist:
                continue
    return None


def _own_addresses(cfg) -> set[str]:
    own = {(cfg.user or "").lower()}
    try:
        from core.mailconf import get_smtp_config

        smtp = get_smtp_config()
        own.add((smtp.user or "").lower())
        own.add((smtp.from_email or "").lower())
    except Exception:
        logger.debug("SMTP indisponível ao montar lista de endereços próprios.")
    return {a for a in own if a}


def _store_message(msg, uid: int, own: set[str]) -> bool:
    """Grava uma mensagem no fio do lead. True se algo entrou no CRM."""
    if (msg.get("X-RA-Notification") or "").strip():
        return False

    from_email = _addr(msg.get("From", ""))
    if from_email in own:
        return False

    bounce = _bounce_report(msg)
    if bounce:
        failed_to, reason = bounce
        card = _card_for_recipient(failed_to)
        if not card:
            return False
        record = CardEmailMessage.objects.create(
            card=card,
            direction=CardEmailMessage.Direction.IN,
            subject=f"Falha de entrega para {failed_to}"[:300],
            body_text=(
                f"O e-mail não chegou em {failed_to}.\n\n"
                f"Resposta do servidor de destino: {reason}\n\n"
                "Confira se o endereço está escrito corretamente."
            ),
            body_kind=CardEmailMessage.BodyKind.TEXT,
            from_email=from_email or "mailer-daemon@invalid",
            to_email=failed_to,
            message_id=(msg.get("Message-ID") or "").strip()[:300],
            imap_uid=str(uid),
            is_bounce=True,
        )
        _notify_inbound(record)
        logger.info("IMAP: falha de entrega para %s no card %s", failed_to, card.pk)
        return True

    reply_to = _addr(msg.get("Reply-To", ""))
    in_reply = (msg.get("In-Reply-To") or "").strip()
    card = _find_card(from_email, reply_to, in_reply)
    if not card:
        logger.info(
            "IMAP: uid=%s de %s sem lead correspondente — ignorado.", uid, from_email
        )
        return False

    mid = (msg.get("Message-ID") or "").strip()
    if mid and CardEmailMessage.objects.filter(message_id=mid).exists():
        return False

    text, html = _body_parts(msg)
    date = timezone.now()
    try:
        parsed = parsedate_to_datetime(msg.get("Date"))
        if parsed:
            date = parsed if timezone.is_aware(parsed) else timezone.make_aware(parsed)
    except Exception:
        logger.debug("Data inválida no uid %s — usando agora.", uid)

    record = CardEmailMessage.objects.create(
        card=card,
        direction=CardEmailMessage.Direction.IN,
        subject=_decode_hdr(msg.get("Subject"))[:300],
        body_text=text,
        body_html=html,
        body_kind=(
            CardEmailMessage.BodyKind.HTML if html else CardEmailMessage.BodyKind.TEXT
        ),
        from_email=from_email or "unknown@invalid",
        to_email=_addr(msg.get("To", "")) or card.lead.email,
        message_id=mid[:300],
        in_reply_to=in_reply[:300],
        imap_uid=str(uid),
    )
    CardEmailMessage.objects.filter(pk=record.pk).update(created_at=date)

    for name, content, ctype in _attachments(msg):
        att = CardEmailAttachment(
            message=record, name=name[:200], content_type=ctype[:120]
        )
        att.file.save(name[:80], ContentFile(content), save=True)

    _notify_inbound(record)
    logger.info("IMAP: mensagem uid=%s no card %s", uid, card.pk)
    return True


def _notify_inbound(record: CardEmailMessage) -> None:
    """Histórico do card + evento de notificação da plataforma (não é e-mail no CRM)."""
    from core.notifications import emit_safe
    from core.notifications.events import CRM_MESSAGE_BOUNCE, CRM_MESSAGE_RECEIVED

    lead = record.card.lead
    CardHistory.objects.create(
        card=record.card,
        user=None,
        text=(
            f"E-mail não entregue para {record.to_email}"
            if record.is_bounce
            else f"Recebeu e-mail: {(record.subject or '(sem assunto)')[:80]}"
        ),
    )
    dedupe = (record.message_id or record.imap_uid or str(record.pk)).strip()[:180]
    link = f"/admin/crm?card={record.card_id}&tab=emails"
    if record.is_bounce:
        emit_safe(
            CRM_MESSAGE_BOUNCE,
            payload={
                "leadName": lead.name,
                "sender": record.from_email or "",
                "subject": record.subject or "",
                "recipient": record.to_email or "",
            },
            dedupe_key=f"bounce:{dedupe}",
            link=link,
        )
        return
    emit_safe(
        CRM_MESSAGE_RECEIVED,
        payload={
            "leadName": lead.name,
            "sender": record.from_email or "",
            "subject": record.subject or "(sem assunto)",
            "recipient": record.to_email or "",
        },
        dedupe_key=f"in:{dedupe}",
        link=link,
    )


def _connect(cfg):
    context = ssl.create_default_context()
    if cfg.allow_self_signed:
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
    if cfg.ssl:
        client = imaplib.IMAP4_SSL(cfg.host, cfg.port, ssl_context=context)
    else:
        client = imaplib.IMAP4(cfg.host, cfg.port)
        client.starttls(ssl_context=context)
    client.login(cfg.user, cfg.password)
    return client


def _disconnect(client) -> None:
    """Fecha sempre a sessão: o servidor limita conexões simultâneas por usuário."""
    if client is None:
        return
    try:
        if client.state == "SELECTED":
            client.close()
    except Exception:
        logger.debug("Falha ao fechar a pasta IMAP.")
    try:
        client.logout()
    except Exception:
        logger.debug("Falha no logout IMAP.")


def poll_inbox(once: bool = True) -> int:
    """Lê mensagens novas na caixa IMAP e anexa no fio do lead. Retorna qtde importada."""
    if not imap_ready():
        logger.warning("IMAP indisponível — poll ignorado.")
        return 0

    cfg = get_imap_config()
    row = EmailSettings.load()
    imported = 0
    client = None

    try:
        client = _connect(cfg)
        client.select("INBOX")

        status, data = client.uid("search", None, "ALL")
        if status != "OK":
            return 0
        last = int(row.imap_last_uid or 0)
        new_uids = [
            u for u in (int(x) for x in (data[0] or b"").split() if x) if u > last
        ]
        if not new_uids:
            return 0

        own = _own_addresses(cfg)
        handled, failed = [], []

        for uid in sorted(new_uids):
            if CardEmailMessage.objects.filter(imap_uid=str(uid)).exists():
                handled.append(uid)
                continue
            try:
                st, raw = client.uid("fetch", str(uid), "(RFC822)")
                if st != "OK" or not raw or not raw[0]:
                    handled.append(uid)
                    continue
                payload = raw[0][1] if isinstance(raw[0], tuple) else raw[0]
                if not isinstance(payload, (bytes, bytearray)):
                    handled.append(uid)
                    continue
                if _store_message(email.message_from_bytes(payload), uid, own):
                    imported += 1
                handled.append(uid)
            except Exception:
                logger.exception("Falha ao processar a mensagem uid=%s", uid)
                failed.append(uid)

        # Falhas ficam de fora da marca d'água para serem tentadas de novo; a
        # deduplicação por imap_uid evita repetir o que já entrou.
        watermark = min(failed) - 1 if failed else max(handled or [last])
        if watermark > last:
            row.imap_last_uid = watermark
            row.save(update_fields=["imap_last_uid", "updated_at"])
    except Exception:
        logger.exception("Falha no poll IMAP")
    finally:
        _disconnect(client)

    return imported
