import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import ModulePermission
from core.audit import log_action
from core.models import AuditLog

from .models import (
    Card,
    CardAttachment,
    CardChecklistItem,
    CardComment,
    CardEmailAttachment,
    CardEmailMessage,
    CardHistory,
    CardNote,
    KanbanColumn,
    Label,
    Lead,
)
from .serializers import (
    CardAttachmentSerializer,
    CardChecklistItemSerializer,
    CardCommentSerializer,
    CardEmailMessageSerializer,
    CardNoteSerializer,
    CardSerializer,
    KanbanColumnSerializer,
    LabelSerializer,
    LeadSerializer,
    PublicLeadSerializer,
)

logger = logging.getLogger(__name__)


def _is_owner_or_admin(user, author_id):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "role", None) == "admin":
        return True
    return author_id == getattr(user, "id", None)


def create_card_for_lead(
    lead,
    *,
    history_text="Lead recebido pelo formulário.",
    user=None,
    notify_email=False,
):
    """Cria automaticamente um card na primeira coluna e notifica."""
    column = KanbanColumn.objects.order_by("order", "id").first()
    if column is None:
        column = KanbanColumn.objects.create(title="Novo Lead", order=0, color="#3b82f6")
    order = Card.objects.filter(column=column).count()
    card = Card.objects.create(lead=lead, column=column, order=order)
    CardHistory.objects.create(card=card, user=user, text=history_text)

    # Alerta de lead duplicado (por e-mail ou telefone já cadastrado)
    dup = (
        Lead.objects.filter(Q(email=lead.email) | Q(phone=lead.phone))
        .exclude(pk=lead.pk)
        .exists()
    )
    dup_txt = " (possível duplicado)" if dup else ""
    area = f"{lead.area_display} — {lead.get_category_display()}"
    if notify_email:
        try:
            from .lead_mail import notify_new_lead

            notify_new_lead(lead, card)
        except Exception:
            logger.exception("Falha ao disparar e-mails do lead %s", lead.pk)
    try:
        from core.notifications import emit_safe
        from core.notifications.events import CRM_LEAD_CREATED

        emit_safe(
            CRM_LEAD_CREATED,
            actor=user,
            payload={
                "leadName": f"{lead.name}{dup_txt}",
                "sender": lead.email or "",
                "eventName": area,
                "recipient": lead.email or "",
            },
            dedupe_key=f"lead:{lead.pk}",
            link=f"/admin/crm?card={card.pk}",
            title=f"Novo lead: {lead.name}{dup_txt}",
            message=area,
        )
    except Exception:
        logger.exception("Falha ao notificar novo lead %s", lead.pk)
    return card


class PublicLeadView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request):
        serializer = PublicLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        try:
            create_card_for_lead(lead, notify_email=True)
        except Exception:
            logger.exception(
                "Lead %s salvo, mas o card/e-mail automático falhou.", lead.pk
            )
        return Response(
            {"detail": "Solicitação enviada com sucesso! Em breve entraremos em contato."},
            status=status.HTTP_201_CREATED,
        )


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [ModulePermission]
    module = "leads"
    filterset_fields = ["category"]
    search_fields = ["name", "email", "phone"]

    def perform_create(self, serializer):
        lead = serializer.save()
        create_card_for_lead(
            lead,
            history_text="Lead criado no painel.",
            user=self.request.user,
        )
        log_action(self.request.user, AuditLog.Action.CREATE, lead)

    def perform_destroy(self, instance):
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()


class LabelViewSet(viewsets.ModelViewSet):
    queryset = Label.objects.all()
    serializer_class = LabelSerializer
    permission_classes = [ModulePermission]
    module = "crm"


class KanbanColumnViewSet(viewsets.ModelViewSet):
    queryset = KanbanColumn.objects.all()
    serializer_class = KanbanColumnSerializer
    permission_classes = [ModulePermission]
    module = "crm"

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.CREATE, instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, instance)

    def perform_destroy(self, instance):
        # Move cards órfãos para a primeira coluna restante
        fallback = (
            KanbanColumn.objects.exclude(pk=instance.pk).order_by("order").first()
        )
        if fallback:
            instance.cards.update(column=fallback)
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Recebe [{id, order}] e persiste a nova ordem das colunas."""
        for item in request.data.get("columns", []):
            KanbanColumn.objects.filter(pk=item["id"]).update(order=item["order"])
        return Response({"detail": "ok"})


class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.select_related("lead", "column", "responsible").prefetch_related(
        "comments__author",
        "notes__author",
        "checklist",
        "attachments__uploaded_by",
        "history__user",
        "labels",
        "emails__files",
        "emails__sent_by",
    )
    serializer_class = CardSerializer
    permission_classes = [ModulePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    module = "crm"
    filterset_fields = ["column", "priority", "responsible"]

    def perform_update(self, serializer):
        old = serializer.instance
        old_column = old.column_id
        old_priority = old.priority
        old_follow = old.follow_up_date
        old_label_ids = set(old.labels.values_list("id", flat=True))
        instance = serializer.save()
        user = self.request.user

        if instance.column_id != old_column:
            CardHistory.objects.create(
                card=instance,
                user=user,
                text=f"Movido para {instance.column.title}",
            )
            log_action(user, AuditLog.Action.MOVE, instance)
        if instance.priority != old_priority:
            CardHistory.objects.create(
                card=instance,
                user=user,
                text=f"Prioridade alterada para {instance.get_priority_display()}",
            )
        if instance.follow_up_date != old_follow:
            if instance.follow_up_date:
                CardHistory.objects.create(
                    card=instance,
                    user=user,
                    text=f"Follow-up definido para {instance.follow_up_date.strftime('%d/%m/%Y')}",
                )
            else:
                CardHistory.objects.create(
                    card=instance,
                    user=user,
                    text="Follow-up removido",
                )
        new_label_ids = set(instance.labels.values_list("id", flat=True))
        if new_label_ids != old_label_ids:
            names = ", ".join(
                instance.labels.order_by("name").values_list("name", flat=True)
            ) or "nenhuma"
            CardHistory.objects.create(
                card=instance,
                user=user,
                text=f"Etiquetas atualizadas: {names}",
            )
        log_action(user, AuditLog.Action.UPDATE, instance)

    def perform_destroy(self, instance):
        """Remove o card e o lead. Dados só daquele card (e-mails, notas, anexos) saem junto."""
        lead = instance.lead
        for att in instance.attachments.all():
            if att.file:
                att.file.delete(save=False)
        for msg in instance.emails.all():
            for f in msg.files.all():
                if f.file:
                    f.file.delete(save=False)
        log_action(self.request.user, AuditLog.Action.DELETE, lead)
        lead.delete()

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        """Move card para outra coluna e/ou posição."""
        card = self.get_object()
        column_id = request.data.get("column")
        order = request.data.get("order", card.order)
        loss_reason = request.data.get("loss_reason", "")

        target = KanbanColumn.objects.filter(pk=column_id).first() if column_id else card.column
        if target and target.is_lost and not (loss_reason or card.loss_reason):
            return Response(
                {"detail": "Informe o motivo da perda para mover para esta coluna."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        moved = target and target.pk != card.column_id
        if target:
            card.column = target
        card.order = order
        if loss_reason:
            card.loss_reason = loss_reason
        card.save()
        if moved:
            text = f"Movido para {card.column.title}"
            if loss_reason:
                text += f" — motivo: {loss_reason[:120]}"
            CardHistory.objects.create(card=card, user=request.user, text=text)
            log_action(request.user, AuditLog.Action.MOVE, card)
        return Response(self.get_serializer(card).data)

    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        card = self.get_object()
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "Comentário vazio."}, status=400)
        comment = CardComment.objects.create(
            card=card, author=request.user, text=text
        )
        CardHistory.objects.create(
            card=card,
            user=request.user,
            text="Enviou mensagem no chat interno",
        )
        return Response(CardCommentSerializer(comment).data, status=201)

    @action(detail=False, methods=["post"], url_path="create-lead")
    def create_lead(self, request):
        """Cria lead + card na primeira coluna (uso do painel CRM)."""
        serializer = LeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        card = create_card_for_lead(
            lead,
            history_text="Lead criado no painel.",
            user=request.user,
        )
        log_action(request.user, AuditLog.Action.CREATE, lead)
        card = self.get_queryset().get(pk=card.pk)
        return Response(self.get_serializer(card).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="emails")
    def send_email_thread(self, request, pk=None):
        """Envia e-mail real para o lead e grava no fio da Troca de e-mails."""
        from core.mailconf import smtp_ready
        from core.mailer import MailSendError, send_email

        card = self.get_object()
        subject = str(request.data.get("subject") or "").strip()
        body = str(request.data.get("body") or "").strip()
        kind = str(request.data.get("kind") or "text").strip().lower()
        if kind not in ("text", "html"):
            kind = "text"
        if not subject:
            return Response({"detail": "Informe o assunto."}, status=400)
        if not body:
            return Response({"detail": "Informe o corpo do e-mail."}, status=400)
        if not smtp_ready():
            return Response(
                {"detail": "Servidor de e-mail indisponível."},
                status=503,
            )

        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        attachments = []
        for f in files:
            attachments.append(
                (f.name, f.read(), getattr(f, "content_type", "") or "application/octet-stream")
            )
            f.seek(0)

        reply_to_id = str(request.data.get("reply_to") or "").strip()
        in_reply = ""
        refs = ""
        if reply_to_id.isdigit():
            prev = card.emails.filter(pk=int(reply_to_id)).first()
            if prev:
                in_reply = prev.message_id or ""
                refs = " ".join(
                    x for x in (prev.in_reply_to, prev.message_id) if x
                ).strip()

        from core.html_sanitize import html_to_text, sanitize_html, text_to_html, wrap_html_document

        if kind == "html":
            cleaned = sanitize_html(body)
            body_html = wrap_html_document(
                cleaned if "<" in body else text_to_html(body)
            )
            body_text = html_to_text(cleaned or body)
            if not body_text:
                return Response({"detail": "Informe o corpo do e-mail."}, status=400)
        else:
            body_html = ""
            body_text = body

        try:
            mid = send_email(
                to=card.lead.email,
                subject=subject,
                body_text=body_text,
                body_html=body_html or None,
                attachments=attachments,
                in_reply_to=in_reply,
                references=refs,
            )
        except MailSendError as exc:
            return Response({"detail": str(exc)}, status=502)

        from .lead_mail import record_outbound

        record = record_outbound(
            card,
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            kind=(
                CardEmailMessage.BodyKind.HTML
                if kind == "html"
                else CardEmailMessage.BodyKind.TEXT
            ),
            to_email=card.lead.email,
            message_id=mid,
            in_reply_to=in_reply,
            sent_by=request.user,
        )
        for f in files:
            att = CardEmailAttachment(
                message=record,
                name=(f.name or "anexo")[:200],
                content_type=(getattr(f, "content_type", "") or "")[:120],
            )
            att.file.save(f.name[:80], f, save=True)

        CardHistory.objects.create(
            card=card,
            user=request.user,
            text=f"Enviou e-mail: {subject[:80]}",
        )
        from core.notifications import emit_safe
        from core.notifications.events import CRM_MESSAGE_SENT

        emit_safe(
            CRM_MESSAGE_SENT,
            actor=request.user,
            payload={
                "leadName": card.lead.name,
                "subject": subject,
                "recipient": card.lead.email or "",
            },
            dedupe_key=f"sent:{record.pk}",
            link=f"/admin/crm?card={card.pk}&tab=emails",
        )
        return Response(
            CardEmailMessageSerializer(record, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="emails/sync")
    def sync_email_thread(self, request, pk=None):
        """Consulta o IMAP na hora e devolve o fio atualizado do lead."""
        from core.mailconf import imap_ready

        card = self.get_object()
        if not imap_ready():
            return Response(
                {"detail": "IMAP não configurado."}, status=503
            )
        try:
            from .imap_inbox import poll_inbox

            fetched = poll_inbox(once=True)
        except Exception as exc:
            logger.exception("Falha ao sincronizar IMAP")
            return Response(
                {"detail": f"Não foi possível ler a caixa de entrada: {exc}"},
                status=502,
            )

        messages = card.emails.order_by("created_at")
        return Response(
            {
                "fetched": fetched,
                "emails": CardEmailMessageSerializer(
                    messages, many=True, context={"request": request}
                ).data,
            }
        )


class CardChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = CardChecklistItem.objects.all()
    serializer_class = CardChecklistItemSerializer
    permission_classes = [ModulePermission]
    module = "crm"
    filterset_fields = ["card"]

    def perform_create(self, serializer):
        item = serializer.save()
        CardHistory.objects.create(
            card=item.card,
            user=self.request.user,
            text=f"Tarefa adicionada: {item.text[:80]}",
        )

    def perform_update(self, serializer):
        old_done = serializer.instance.done
        item = serializer.save()
        if item.done != old_done:
            CardHistory.objects.create(
                card=item.card,
                user=self.request.user,
                text=f"Tarefa {'concluída' if item.done else 'reaberta'}: {item.text[:80]}",
            )

    def perform_destroy(self, instance):
        CardHistory.objects.create(
            card=instance.card,
            user=self.request.user,
            text=f"Tarefa removida: {instance.text[:80]}",
        )
        instance.delete()


class CardNoteViewSet(viewsets.ModelViewSet):
    queryset = CardNote.objects.select_related("author", "card")
    serializer_class = CardNoteSerializer
    permission_classes = [ModulePermission]
    module = "crm"
    filterset_fields = ["card"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        note = serializer.save(author=self.request.user)
        CardHistory.objects.create(
            card=note.card,
            user=self.request.user,
            text=f"Anotação criada: {note.text[:80]}",
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not _is_owner_or_admin(request.user, instance.author_id):
            return Response(
                {"detail": "Só quem criou a anotação pode editá-la."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not _is_owner_or_admin(request.user, instance.author_id):
            return Response(
                {"detail": "Só quem criou a anotação pode removê-la."},
                status=status.HTTP_403_FORBIDDEN,
            )
        CardHistory.objects.create(
            card=instance.card,
            user=request.user,
            text="Anotação removida",
        )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardCommentViewSet(viewsets.ModelViewSet):
    queryset = CardComment.objects.select_related("author", "card")
    serializer_class = CardCommentSerializer
    permission_classes = [ModulePermission]
    module = "crm"
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not _is_owner_or_admin(request.user, instance.author_id):
            return Response(
                {"detail": "Só quem enviou a mensagem pode editá-la."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not _is_owner_or_admin(request.user, instance.author_id):
            return Response(
                {"detail": "Só quem enviou a mensagem pode removê-la."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CardAttachment.objects.select_related("uploaded_by", "card")
    serializer_class = CardAttachmentSerializer
    permission_classes = [ModulePermission]
    module = "crm"
    filterset_fields = ["card"]

    def perform_create(self, serializer):
        card = serializer.validated_data["card"]
        if card.attachments.count() >= 5:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"detail": "Máximo de 5 anexos por card."}
            )
        attachment = serializer.save()
        CardHistory.objects.create(
            card=card,
            user=self.request.user,
            text=f"Anexo enviado: {attachment.name or attachment.file.name}",
        )

    def perform_destroy(self, instance):
        card = instance.card
        name = instance.name or (instance.file.name if instance.file else "arquivo")
        CardHistory.objects.create(
            card=card,
            user=self.request.user,
            text=f"Anexo removido: {name}",
        )
        instance.delete()
