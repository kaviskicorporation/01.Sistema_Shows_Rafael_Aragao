"""API da matriz, destinatários e templates de notificação."""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import ModulePermission
from core.models import (
    NotificationPreference,
    NotificationRecipient,
    NotificationTemplate,
)
from core.notifications.events import catalog_payload, get_spec
from core.notifications.mail import mailbox_addresses
from core.notifications.service import ensure_preferences, subscribe_recipient
from core.serializers import (
    NotificationPreferenceSerializer,
    NotificationRecipientSerializer,
)


class NotificationSettingsView(APIView):
    permission_classes = [ModulePermission]
    module = "notifications"

    def get(self, request):
        ensure_preferences()
        prefs = {
            row.event_type: NotificationPreferenceSerializer(row).data
            for row in NotificationPreference.objects.all()
        }
        events = []
        for item in catalog_payload():
            pref = prefs.get(item["key"]) or {
                "event_type": item["key"],
                "notify_admin": True,
                "notify_gerente": False,
                "notify_comercial": False,
                "notify_visualizador": False,
                "send_email": False,
                "email_recipient_ids": [],
            }
            events.append({**item, **{k: pref[k] for k in pref if k != "event_type"}})
        templates = {
            row.event_type: {
                "subject": row.subject,
                "body": row.body,
                "is_custom": row.is_custom,
            }
            for row in NotificationTemplate.objects.all()
        }
        for item in events:
            tpl = templates.get(item["key"])
            item["subject"] = (
                tpl["subject"] if tpl and tpl["is_custom"] else item["default_subject"]
            )
            item["body"] = tpl["body"] if tpl and tpl["is_custom"] else item["default_body"]
            item["is_custom"] = bool(tpl and tpl["is_custom"])
        return Response(
            {
                "events": events,
                "recipients": NotificationRecipientSerializer(
                    NotificationRecipient.objects.all(), many=True
                ).data,
                "mailbox_addresses": sorted(mailbox_addresses()),
            }
        )


class NotificationPreferenceBulkView(APIView):
    permission_classes = [ModulePermission]
    module = "notifications"

    def put(self, request):
        if not request.user.can_write("notifications"):
            return Response({"detail": "Sem permissão."}, status=403)
        ensure_preferences()
        rows = request.data.get("preferences") or request.data.get("events") or []
        if not isinstance(rows, list):
            return Response({"detail": "Envie a lista de preferências."}, status=400)
        updated = 0
        for item in rows:
            if not isinstance(item, dict):
                continue
            key = str(item.get("event_type") or item.get("key") or "").strip()
            if not get_spec(key):
                continue
            pref, _ = NotificationPreference.objects.get_or_create(event_type=key)
            for field in (
                "notify_admin",
                "notify_gerente",
                "notify_comercial",
                "notify_visualizador",
            ):
                if field in item:
                    setattr(pref, field, bool(item.get(field)))
            if "email_recipient_ids" in item:
                raw = item.get("email_recipient_ids") or []
                ids = []
                if isinstance(raw, list):
                    for value in raw:
                        try:
                            n = int(value)
                        except (TypeError, ValueError):
                            continue
                        if n > 0 and n not in ids:
                            ids.append(n)
                valid = set(
                    NotificationRecipient.objects.filter(pk__in=ids).values_list(
                        "id", flat=True
                    )
                )
                pref.email_recipient_ids = [i for i in ids if i in valid]
                pref.send_email = bool(pref.email_recipient_ids)
            elif "send_email" in item:
                pref.send_email = bool(item.get("send_email"))
            pref.save()
            updated += 1
        return Response({"detail": "ok", "updated": updated})


class NotificationRecipientViewSet(viewsets.ModelViewSet):
    queryset = NotificationRecipient.objects.all()
    serializer_class = NotificationRecipientSerializer
    permission_classes = [ModulePermission]
    module = "notifications"
    pagination_class = None

    def perform_create(self, serializer):
        instance = serializer.save()
        subscribe_recipient(instance.pk)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_primary and instance.is_active:
            subscribe_recipient(instance.pk)

    def perform_destroy(self, instance):
        pk = instance.pk
        instance.delete()
        for pref in NotificationPreference.objects.all():
            ids = [i for i in (pref.email_recipient_ids or []) if i != pk]
            if ids != (pref.email_recipient_ids or []):
                pref.email_recipient_ids = ids
                pref.send_email = bool(ids)
                pref.save(update_fields=["email_recipient_ids", "send_email"])


class NotificationTemplateView(APIView):
    permission_classes = [ModulePermission]
    module = "notifications"

    def put(self, request):
        if not request.user.can_write("notifications"):
            return Response({"detail": "Sem permissão."}, status=403)
        key = str(request.data.get("event_type") or "").strip()
        spec = get_spec(key)
        if spec is None:
            return Response({"detail": "Evento inválido."}, status=400)
        subject = str(request.data.get("subject") or "").strip()[:200]
        body = str(request.data.get("body") or "").strip()
        row, _ = NotificationTemplate.objects.get_or_create(event_type=key)
        row.subject = subject or spec.default_subject
        row.body = body or spec.default_body
        row.is_custom = True
        row.save()
        return Response(
            {
                "event_type": key,
                "subject": row.subject,
                "body": row.body,
                "is_custom": True,
                "placeholders": list(spec.placeholders),
            }
        )

    def post(self, request):
        """Restaura o template padrão do código."""
        if not request.user.can_write("notifications"):
            return Response({"detail": "Sem permissão."}, status=403)
        key = str(request.data.get("event_type") or "").strip()
        spec = get_spec(key)
        if spec is None:
            return Response({"detail": "Evento inválido."}, status=400)
        NotificationTemplate.objects.filter(event_type=key).update(
            subject="", body="", is_custom=False
        )
        return Response(
            {
                "event_type": key,
                "subject": spec.default_subject,
                "body": spec.default_body,
                "is_custom": False,
                "placeholders": list(spec.placeholders),
            },
            status=status.HTTP_200_OK,
        )
