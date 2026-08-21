from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import ModulePermission
from core.audit import log_action
from core.models import AuditLog, SiteConfig

from .models import Event, EventImage, EventTemplate
from .serializers import (
    EventImageSerializer,
    EventSerializer,
    EventTemplateSerializer,
    PublicEventSerializer,
)


def event_notify_payload(instance: Event) -> dict:
    city = (instance.city or "").strip()
    state = (instance.state or "").strip()
    city_label = f"{city}/{state}" if city and state else city or state
    date_s = instance.date.strftime("%d/%m/%Y") if instance.date else ""
    time_s = instance.time.strftime("%H:%M") if instance.time else ""
    return {
        "eventName": instance.name or "",
        "city": city_label,
        "eventDate": date_s,
        "eventTime": time_s,
        "venue": instance.venue or "",
    }


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().prefetch_related("gallery", "sessions")
    serializer_class = EventSerializer
    permission_classes = [ModulePermission]
    module = "events"
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "city", "state"]
    search_fields = ["name", "city", "venue"]
    ordering_fields = ["date", "name", "created_at"]
    # Lista completa no painel (igual à agenda pública). PAGE_SIZE=25 escondia shows novos.
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        search = params.get("search")
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(
                city__icontains=search
            )
        date_from = params.get("date_from")
        date_to = params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs.distinct()

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.CREATE, instance)
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_CREATED

        emit_safe(
            EVENT_CREATED,
            actor=self.request.user,
            payload=event_notify_payload(instance),
            dedupe_key=f"event:{instance.pk}:created",
            link=f"/admin/eventos?id={instance.pk}",
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, instance)
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_UPDATED

        emit_safe(
            EVENT_UPDATED,
            actor=self.request.user,
            payload=event_notify_payload(instance),
            dedupe_key=f"event:{instance.pk}:updated:{instance.updated_at.timestamp() if getattr(instance, 'updated_at', None) else instance.pk}",
            link=f"/admin/eventos?id={instance.pk}",
        )

    def perform_destroy(self, instance):
        payload = event_notify_payload(instance)
        pk = instance.pk
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_DELETED

        emit_safe(
            EVENT_DELETED,
            actor=self.request.user,
            payload=payload,
            dedupe_key=f"event:{pk}:deleted",
            link="/admin/eventos",
        )

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        event = self.get_object()
        clone = Event.objects.get(pk=event.pk)
        clone.pk = None
        clone.slug = ""
        clone.name = f"{event.name} (cópia)"
        clone.status = Event.Status.RASCUNHO
        clone.save()
        log_action(request.user, AuditLog.Action.CREATE, clone, {"duplicated_from": event.pk})
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_CREATED

        emit_safe(
            EVENT_CREATED,
            actor=request.user,
            payload=event_notify_payload(clone),
            dedupe_key=f"event:{clone.pk}:created",
            link=f"/admin/eventos?id={clone.pk}",
        )
        return Response(
            self.get_serializer(clone).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="add-session")
    def add_session(self, request, pk=None):
        """Agendar sessão extra do mesmo espetáculo."""
        event = self.get_object()
        parent = event.parent or event
        session = Event.objects.get(pk=event.pk)
        session.pk = None
        session.slug = ""
        session.parent = parent
        session.date = request.data.get("date", event.date)
        session.time = request.data.get("time", event.time)
        session.status = Event.Status.RASCUNHO
        session.save()
        log_action(request.user, AuditLog.Action.CREATE, session, {"session_of": parent.pk})
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_CREATED

        emit_safe(
            EVENT_CREATED,
            actor=request.user,
            payload=event_notify_payload(session),
            dedupe_key=f"event:{session.pk}:created",
            link=f"/admin/eventos?id={session.pk}",
        )
        return Response(
            self.get_serializer(session).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """Operações em lote: alterar status ou ocultar múltiplos eventos."""
        ids = request.data.get("ids", [])
        new_status = request.data.get("status")
        events = Event.objects.filter(pk__in=ids)
        updated = 0
        from core.notifications import emit_safe
        from core.notifications.events import EVENT_UPDATED

        for event in events:
            if new_status:
                event.status = new_status
                event.save()
                log_action(request.user, AuditLog.Action.UPDATE, event, {"bulk_status": new_status})
                emit_safe(
                    EVENT_UPDATED,
                    actor=request.user,
                    payload=event_notify_payload(event),
                    dedupe_key=f"event:{event.pk}:updated:{event.updated_at.timestamp() if getattr(event, 'updated_at', None) else event.pk}",
                    link=f"/admin/eventos?id={event.pk}",
                )
                updated += 1
        return Response({"updated": updated})


class EventImageViewSet(viewsets.ModelViewSet):
    queryset = EventImage.objects.all()
    serializer_class = EventImageSerializer
    permission_classes = [ModulePermission]
    module = "events"
    filterset_fields = ["event"]


class EventTemplateViewSet(viewsets.ModelViewSet):
    queryset = EventTemplate.objects.all()
    serializer_class = EventTemplateSerializer
    permission_classes = [ModulePermission]
    module = "events"


class PublicEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoint público: aplica a regra de ocultação automática."""

    serializer_class = PublicEventSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    lookup_field = "slug"
    pagination_class = None  # agenda completa na página pública

    def get_queryset(self):
        config = SiteConfig.load()
        now = timezone.now()
        visible_ids = [
            e.pk
            for e in Event.objects.filter(status=Event.Status.PUBLICADO)
            if e.is_public_visible(config, now)
        ]
        qs = Event.objects.filter(pk__in=visible_ids).prefetch_related("gallery")
        city = self.request.query_params.get("city")
        state = self.request.query_params.get("state")
        if city:
            qs = qs.filter(city__iexact=city)
        if state:
            qs = qs.filter(state__iexact=state)
        return qs.order_by("date", "time")
