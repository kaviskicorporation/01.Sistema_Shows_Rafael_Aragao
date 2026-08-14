import csv
from datetime import timedelta
from io import BytesIO

from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, ModulePermission
from core.demo_data import DEMO_LEADS
from crm.models import Card, CardHistory, KanbanColumn, Label, Lead
from events.models import Event

from .models import AuditLog, Notification, SiteConfig
from .serializers import (
    AuditLogSerializer,
    NotificationSerializer,
    SiteConfigSerializer,
)


class SiteConfigView(APIView):
    """GET/PUT da configuração singleton (admin) e GET público."""

    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [ModulePermission()]

    module = "config"

    def get(self, request):
        config = SiteConfig.load()
        return Response(SiteConfigSerializer(config, context={"request": request}).data)

    def put(self, request):
        if not (request.user.is_authenticated and request.user.can_write("config")):
            return Response({"detail": "Sem permissão."}, status=403)
        config = SiteConfig.load()
        serializer = SiteConfigSerializer(
            config, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            model_name="SiteConfig",
            object_id="1",
            object_repr="Configuração do site",
        )
        return Response(serializer.data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [ModulePermission]
    module = "audit"
    filterset_fields = ["action", "model_name", "user"]
    search_fields = ["object_repr", "model_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs

    @action(detail=False, methods=["get"])
    def export(self, request):
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=auditoria.csv"
        writer = csv.writer(response)
        writer.writerow(["Data", "Usuário", "Ação", "Modelo", "Objeto"])
        for log in qs:
            writer.writerow([
                log.created_at.strftime("%d/%m/%Y %H:%M"),
                log.user.username if log.user else "-",
                log.get_action_display(),
                log.model_name,
                log.object_repr,
            ])
        return response


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({"detail": "ok"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": Notification.objects.filter(is_read=False).count()})


class DashboardView(APIView):
    permission_classes = [ModulePermission]
    module = "dashboard"

    def get(self, request):
        now = timezone.now()
        today = now.date()
        config = SiteConfig.load()

        upcoming = [
            e for e in Event.objects.filter(
                status=Event.Status.PUBLICADO, date__gte=today
            )
        ]
        realized = Event.objects.filter(status=Event.Status.REALIZADO).count()

        lost_cols = KanbanColumn.objects.filter(is_lost=True).values_list("id", flat=True)
        won_cols = KanbanColumn.objects.filter(is_won=True).values_list("id", flat=True)
        total_cards = Card.objects.count()
        won = Card.objects.filter(column__in=won_cols).count()
        lost = Card.objects.filter(column__in=lost_cols).count()
        in_progress = Card.objects.exclude(column__in=list(won_cols) + list(lost_cols)).count()
        conversion = round((won / total_cards) * 100, 1) if total_cards else 0

        events_by_month = {}
        for e in Event.objects.all():
            key = e.date.strftime("%Y-%m")
            events_by_month[key] = events_by_month.get(key, 0) + 1
        events_series = [
            {"month": k, "count": v} for k, v in sorted(events_by_month.items())
        ]

        leads_by_status = [
            {"status": c.title, "count": c.cards.count(), "color": c.color}
            for c in KanbanColumn.objects.all()
        ]

        top_cities = list(
            Event.objects.values("city")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        demo_active = Lead.objects.filter(is_demo=True).exists() or config.demo_data_active

        return Response({
            "cards": {
                "upcoming_events": len(upcoming),
                "realized_events": realized,
                "leads_total": Lead.objects.count(),
                "leads_last_30d": Lead.objects.filter(
                    created_at__gte=now - timedelta(days=30)
                ).count(),
                "in_progress": in_progress,
                "won": won,
                "lost": lost,
                "conversion_rate": conversion,
            },
            "events_series": events_series,
            "leads_by_status": leads_by_status,
            "top_cities": top_cities,
            "demo_data_active": demo_active,
        })


class TimelineView(APIView):
    """Linha do tempo — quem tiver módulo de auditoria."""

    permission_classes = [ModulePermission]
    module = "audit"

    def get(self, request):
        logs = AuditLog.objects.select_related("user")[:20]
        return Response(AuditLogSerializer(logs, many=True).data)


class DemoDataView(APIView):
    """Gera / remove leads+cards de demonstração (somente admin)."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        count = Lead.objects.filter(is_demo=True).count()
        config = SiteConfig.load()
        return Response({
            "demo_data_active": count > 0 or config.demo_data_active,
            "demo_leads": count,
        })

    def post(self, request):
        """Cria/recria dados demo de CRM para o dashboard."""
        # Limpa demo anterior
        Lead.objects.filter(is_demo=True).delete()

        columns = list(KanbanColumn.objects.order_by("order"))
        if not columns:
            return Response(
                {"detail": "Crie as colunas do CRM antes (rode o seed)."},
                status=400,
            )

        label_corp = Label.objects.filter(name="Corporativo").first()
        label_prio = Label.objects.filter(name="Prioridade").first()

        created = 0
        for i, (name, area, _area_txt, email, phone, cat, col_idx, prio) in enumerate(DEMO_LEADS):
            col = columns[min(col_idx, len(columns) - 1)]
            lead = Lead.objects.create(
                name=name,
                area_atuacao=area,
                email=email,
                phone=phone,
                category=cat,
                message="[DEMO] Interesse em contratar o espetáculo Rei dos Peão.",
                is_demo=True,
            )
            card = Card.objects.create(
                lead=lead,
                column=col,
                order=i,
                priority=prio,
            )
            if label_corp:
                card.labels.add(label_corp)
            if label_prio and prio == "alta":
                card.labels.add(label_prio)
            CardHistory.objects.create(
                card=card, text="[DEMO] Lead de demonstração criado."
            )
            created += 1

        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="DemoData",
            object_id="demo",
            object_repr=f"{created} leads de demonstração",
        )

        config = SiteConfig.load()
        config.demo_data_active = True
        config.save(update_fields=["demo_data_active", "updated_at"])

        Notification.objects.create(
            title="Dados de demonstração carregados",
            message=f"{created} leads demo no CRM. Remova quando for entregar o site.",
            link="/admin",
        )

        return Response({"detail": "ok", "created": created, "demo_data_active": True})

    def delete(self, request):
        deleted, _ = Lead.objects.filter(is_demo=True).delete()
        config = SiteConfig.load()
        config.demo_data_active = False
        config.save(update_fields=["demo_data_active", "updated_at"])
        AuditLog.objects.create(
            user=request.user,
            action=AuditLog.Action.DELETE,
            model_name="DemoData",
            object_id="demo",
            object_repr="Dados de demonstração removidos",
        )
        return Response({"detail": "ok", "deleted": deleted, "demo_data_active": False})



class LeadExportView(APIView):
    permission_classes = [ModulePermission]
    module = "leads"

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=leads.csv"
        writer = csv.writer(response)
        writer.writerow(["Nome", "Área", "E-mail", "Telefone", "Categoria", "Mensagem", "Data"])
        for lead in Lead.objects.all():
            writer.writerow([
                lead.name,
                lead.area_display,
                lead.email,
                lead.phone,
                lead.get_category_display(),
                lead.message,
                lead.created_at.strftime("%d/%m/%Y %H:%M"),
            ])
        return response


class EventExportView(APIView):
    permission_classes = [ModulePermission]
    module = "events"

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=eventos.csv"
        writer = csv.writer(response)
        writer.writerow(["Nome", "Data", "Hora", "Local", "Cidade", "Estado", "Status"])
        for e in Event.objects.all():
            writer.writerow([
                e.name,
                e.date.strftime("%d/%m/%Y"),
                e.time.strftime("%H:%M") if e.time else "",
                e.venue,
                e.city,
                e.state,
                e.get_status_display(),
            ])
        return response


class DashboardPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas

        now = timezone.now()
        today = now.date()
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(2 * cm, height - 2 * cm, "Relatório do Dashboard — Rafael Aragão")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(2 * cm, height - 2.7 * cm, f"Gerado em {now.strftime('%d/%m/%Y %H:%M')}")

        won_cols = KanbanColumn.objects.filter(is_won=True).values_list("id", flat=True)
        lines = [
            f"Próximos eventos publicados: {Event.objects.filter(status=Event.Status.PUBLICADO, date__gte=today).count()}",
            f"Eventos realizados: {Event.objects.filter(status=Event.Status.REALIZADO).count()}",
            f"Total de leads: {Lead.objects.count()}",
            f"Contratos fechados: {Card.objects.filter(column__in=won_cols).count()}",
        ]
        y = height - 4 * cm
        pdf.setFont("Helvetica", 12)
        for line in lines:
            pdf.drawString(2 * cm, y, line)
            y -= 0.8 * cm

        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return HttpResponse(
            buffer.getvalue(),
            content_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=dashboard.pdf"},
        )
