from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import ModulePermission
from core.audit import log_action
from core.models import AuditLog, Notification

from .models import (
    Card,
    CardAttachment,
    CardChecklistItem,
    CardComment,
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
    CardNoteSerializer,
    CardSerializer,
    KanbanColumnSerializer,
    LabelSerializer,
    LeadSerializer,
    PublicLeadSerializer,
)


def _is_owner_or_admin(user, author_id):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "role", None) == "admin":
        return True
    return author_id == getattr(user, "id", None)


def create_card_for_lead(lead, *, history_text="Lead recebido pelo formulário.", user=None):
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
    Notification.objects.create(
        title=f"Novo lead: {lead.name}{dup_txt}",
        message=f"{lead.area_display} — {lead.get_category_display()}",
        link="/admin/crm",
    )
    return card


class PublicLeadView(viewsets.ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def create(self, request):
        serializer = PublicLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        create_card_for_lead(lead)
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
    )
    serializer_class = CardSerializer
    permission_classes = [ModulePermission]
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
