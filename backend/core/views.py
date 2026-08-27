import csv
from datetime import timedelta
from io import BytesIO

from django.conf import settings
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
from core.audit import log_action
from core.demo_data import DEMO_LEADS
from crm.models import Card, CardHistory, KanbanColumn, Label, Lead
from events.models import Event

from .email_defaults import KAVISKI_IMAP, KAVISKI_SMTP
from .mailconf import get_imap_config, get_smtp_config, imap_ready, smtp_ready
from .mailer import MailSendError, send_email
from .models import AuditLog, EmailSettings, Notification, SiteConfig, Sponsor, FaqItem
from .serializers import (
    AuditLogSerializer,
    FaqItemSerializer,
    NotificationSerializer,
    SiteConfigSerializer,
    SponsorSerializer,
)


def _emit_configuration(user, detail: str, link: str = "/admin/configuracoes"):
    from django.utils import timezone
    from core.notifications import emit_safe
    from core.notifications.events import CONFIGURATION_UPDATED

    emit_safe(
        CONFIGURATION_UPDATED,
        actor=user,
        payload={"eventName": detail},
        dedupe_key=f"config:{detail[:40]}:{timezone.now().timestamp()}",
        link=link,
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
        form_before = config.contact_form_config
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
        from core.notifications import emit_safe
        from core.notifications.events import CONFIGURATION_UPDATED, FORM_UPDATED
        from django.utils import timezone

        stamp = timezone.now().timestamp()
        if "contact_form_config" in serializer.validated_data and (
            serializer.validated_data.get("contact_form_config") != form_before
        ):
            emit_safe(
                FORM_UPDATED,
                actor=request.user,
                payload={"eventName": "Contato"},
                dedupe_key=f"form:contact:{stamp}",
                link="/admin/formulario-contato",
            )
        other = {k: v for k, v in serializer.validated_data.items() if k != "contact_form_config"}
        if other:
            emit_safe(
                CONFIGURATION_UPDATED,
                actor=request.user,
                payload={"eventName": "configurações do site"},
                dedupe_key=f"config:site:{stamp}",
                link="/admin/configuracoes",
            )
        return Response(serializer.data)


class SponsorViewSet(viewsets.ModelViewSet):
    """CRUD de patrocinadores (admin) — GET público lista ativos."""

    serializer_class = SponsorSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    module = "config"

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [ModulePermission()]

    def get_queryset(self):
        qs = Sponsor.objects.all().order_by("order", "id")
        user = self.request.user
        if (
            user
            and user.is_authenticated
            and getattr(user, "has_module", lambda _m: False)("config")
        ):
            return qs
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        if "order" not in serializer.validated_data:
            last = Sponsor.objects.order_by("-order").first()
            instance = serializer.save(order=(last.order + 1) if last else 0)
        else:
            instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.CREATE, instance)
        _emit_configuration(self.request.user, f'patrocinador "{instance.name}"')

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, instance)
        _emit_configuration(self.request.user, f'patrocinador "{instance.name}"')

    def perform_destroy(self, instance):
        name = instance.name
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()
        _emit_configuration(self.request.user, f'patrocinador "{name}"')

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        for item in request.data.get("sponsors", []):
            Sponsor.objects.filter(pk=item.get("id")).update(
                order=item.get("order", 0)
            )
        return Response({"detail": "ok"})


class FaqItemViewSet(viewsets.ModelViewSet):
    """CRUD do FAQ (admin) — GET público lista só itens ativos."""

    serializer_class = FaqItemSerializer
    module = "config"
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [ModulePermission()]

    def get_queryset(self):
        qs = FaqItem.objects.all().order_by("order", "id")
        user = self.request.user
        if (
            user
            and user.is_authenticated
            and getattr(user, "has_module", lambda _m: False)("config")
        ):
            return qs
        return qs.filter(is_active=True)

    def perform_create(self, serializer):
        if "order" not in serializer.validated_data:
            last = FaqItem.objects.order_by("-order").first()
            instance = serializer.save(order=(last.order + 1) if last else 0)
        else:
            instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.CREATE, instance)
        _emit_configuration(
            self.request.user, f'FAQ "{instance.question[:80]}"', "/admin/configuracoes"
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, instance)
        _emit_configuration(
            self.request.user, f'FAQ "{instance.question[:80]}"', "/admin/configuracoes"
        )

    def perform_destroy(self, instance):
        question = instance.question
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()
        _emit_configuration(
            self.request.user, f'FAQ "{question[:80]}"', "/admin/configuracoes"
        )

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        for item in request.data.get("items", []):
            FaqItem.objects.filter(pk=item.get("id")).update(
                order=item.get("order", 0)
            )
        return Response({"detail": "ok"})


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
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        is_read = request.query_params.get("is_read")
        if is_read in ("0", "false", "False"):
            qs = qs.filter(is_read=False)
        elif is_read in ("1", "true", "True"):
            qs = qs.filter(is_read=True)
        group = (request.query_params.get("group") or "").strip()
        if group:
            from core.notifications.events import EVENTS

            keys = [k for k, spec in EVENTS.items() if spec.group == group]
            if keys:
                qs = qs.filter(event_type__in=keys)
            else:
                qs = qs.none()
        try:
            page = max(int(request.query_params.get("page") or 0), 0)
        except (TypeError, ValueError):
            page = 0
        try:
            page_size = min(max(int(request.query_params.get("page_size") or 0), 0), 100)
        except (TypeError, ValueError):
            page_size = 0
        try:
            limit = min(max(int(request.query_params.get("limit") or 80), 1), 80)
        except (TypeError, ValueError):
            limit = 80
        if page and page_size:
            start = (page - 1) * page_size
            total = qs.count()
            items = qs[start : start + page_size]
            return Response(
                {
                    "count": total,
                    "results": self.get_serializer(items, many=True).data,
                }
            )
        return Response(self.get_serializer(qs[:limit], many=True).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"detail": "ok"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        qs = self.get_queryset()
        latest = qs.order_by("-id").values_list("id", flat=True).first()
        return Response(
            {
                "count": qs.filter(is_read=False).count(),
                "latest_id": latest or 0,
            }
        )


class DashboardView(APIView):
    permission_classes = [ModulePermission]
    module = "dashboard"

    def get(self, request):
        now = timezone.now()
        today = now.date()
        config = SiteConfig.load()
        week_ago = now - timedelta(days=7)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        upcoming_qs = Event.objects.filter(
            status=Event.Status.PUBLICADO, date__gte=today
        ).order_by("date", "time")
        upcoming_list = list(upcoming_qs[:8])
        upcoming_count = upcoming_qs.count()

        realized = Event.objects.filter(status=Event.Status.REALIZADO).count()
        draft = Event.objects.filter(status=Event.Status.RASCUNHO).count()
        published = Event.objects.filter(status=Event.Status.PUBLICADO).count()
        total_events = Event.objects.count()

        lost_cols = list(
            KanbanColumn.objects.filter(is_lost=True).values_list("id", flat=True)
        )
        won_cols = list(
            KanbanColumn.objects.filter(is_won=True).values_list("id", flat=True)
        )
        total_cards = Card.objects.count()
        won = Card.objects.filter(column_id__in=won_cols).count()
        lost = Card.objects.filter(column_id__in=lost_cols).count()
        in_progress = Card.objects.exclude(
            column_id__in=won_cols + lost_cols
        ).count()
        conversion = round((won / total_cards) * 100, 1) if total_cards else 0.0

        events_by_month = {}
        for e in Event.objects.all():
            key = e.date.strftime("%Y-%m")
            events_by_month[key] = events_by_month.get(key, 0) + 1

        # Últimos 6 meses no gráfico (mesmo zerados) + meses extras com shows
        series_keys = []
        y, m = today.year, today.month
        for _ in range(6):
            series_keys.append(f"{y:04d}-{m:02d}")
            m -= 1
            if m == 0:
                m = 12
                y -= 1
        series_keys.reverse()
        known = set(series_keys)
        events_series = [
            {"month": k, "count": events_by_month.get(k, 0)} for k in series_keys
        ]
        for k, v in sorted(events_by_month.items()):
            if k not in known:
                events_series.append({"month": k, "count": v})
        events_series = sorted(events_series, key=lambda x: x["month"])[-8:]

        leads_by_status = [
            {"status": c.title, "count": c.cards.count(), "color": c.color}
            for c in KanbanColumn.objects.order_by("order")
        ]

        top_cities = list(
            Event.objects.values("city")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )

        leads_total = Lead.objects.count()
        leads_last_30d = Lead.objects.filter(
            created_at__gte=now - timedelta(days=30)
        ).count()
        leads_week = Lead.objects.filter(created_at__gte=week_ago).count()
        leads_today = Lead.objects.filter(created_at__gte=day_start).count()

        recent_leads = [
            {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email or "",
                "area": lead.area_display or "",
                "category": lead.get_category_display() or lead.category or "",
                "created_at": lead.created_at.isoformat(),
            }
            for lead in Lead.objects.order_by("-created_at")[:6]
        ]

        next_events = [
            {
                "id": e.id,
                "name": e.name,
                "slug": e.slug,
                "date": e.date.isoformat(),
                "time": e.time.strftime("%H:%M") if e.time else None,
                "city": e.city,
                "state": e.state,
                "venue": e.venue or "",
                "status": e.status,
            }
            for e in upcoming_list
        ]

        demo_active = (
            Lead.objects.filter(is_demo=True).exists() or config.demo_data_active
        )

        return Response(
            {
                "site_title": config.hero_title or "Rafael Aragão",
                "cards": {
                    "upcoming_events": upcoming_count,
                    "realized_events": realized,
                    "events_total": total_events,
                    "events_draft": draft,
                    "events_published": published,
                    "leads_total": leads_total,
                    "leads_last_30d": leads_last_30d,
                    "leads_week": leads_week,
                    "leads_today": leads_today,
                    "in_progress": in_progress,
                    "won": won,
                    "lost": lost,
                    "conversion_rate": conversion,
                    "pipeline_total": total_cards,
                },
                "next_events": next_events,
                "recent_leads": recent_leads,
                "events_series": events_series,
                "leads_by_status": leads_by_status,
                "top_cities": top_cities,
                "demo_data_active": demo_active,
            }
        )


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


class EmailSettingsView(APIView):
    """GET/PUT da config SMTP/IMAP. Senha nunca volta em claro — só bolinhas na UI."""

    permission_classes = [ModulePermission]
    module = "config"

    def get(self, request):
        row = EmailSettings.load()
        if row.team_to:
            row.team_to = ""
            row.save(update_fields=["team_to"])
        smtp_ok = row.smtp_package_complete()
        imap_ok = row.imap_package_complete()
        # Se ainda não há override no DB, mostra o padrão Kaviski (sem senha em claro)
        smtp = {
            "host": row.smtp_host if smtp_ok else KAVISKI_SMTP["host"],
            "port": str(row.smtp_port) if smtp_ok and row.smtp_port else str(KAVISKI_SMTP["port"]),
            "user": row.smtp_user if smtp_ok else KAVISKI_SMTP["user"],
            "from_email": row.smtp_from if smtp_ok else KAVISKI_SMTP["from_email"],
            "password_set": bool((row.smtp_password if smtp_ok else KAVISKI_SMTP["password"])),
            "use_user": smtp_ok
            and bool(row.smtp_user)
            and row.smtp_user.strip() == (row.smtp_from or "").strip(),
        }
        imap = {
            "host": row.imap_host if imap_ok else KAVISKI_IMAP["host"],
            "port": str(row.imap_port) if imap_ok and row.imap_port else str(KAVISKI_IMAP["port"]),
            "user": row.imap_user if imap_ok else KAVISKI_IMAP["user"],
            "from_email": row.imap_user if imap_ok else KAVISKI_IMAP["user"],
            "password_set": bool((row.imap_password if imap_ok else KAVISKI_IMAP["password"])),
            "use_user": True,
            "ssl": bool(row.imap_ssl) if imap_ok else bool(KAVISKI_IMAP["ssl"]),
            "allow_self_signed": bool(row.imap_allow_self_signed)
            if imap_ok
            else bool(KAVISKI_IMAP["allow_self_signed"]),
        }
        return Response(
            {
                "smtp_override": smtp_ok,
                "imap_override": imap_ok,
                "smtp": smtp,
                "imap": imap,
                "defaults": {
                    "smtp": {
                        "host": KAVISKI_SMTP["host"],
                        "port": str(KAVISKI_SMTP["port"]),
                        "user": KAVISKI_SMTP["user"],
                        "from_email": KAVISKI_SMTP["from_email"],
                    },
                    "imap": {
                        "host": KAVISKI_IMAP["host"],
                        "port": str(KAVISKI_IMAP["port"]),
                        "user": KAVISKI_IMAP["user"],
                        "from_email": KAVISKI_IMAP["user"],
                        "ssl": KAVISKI_IMAP["ssl"],
                        "allow_self_signed": KAVISKI_IMAP["allow_self_signed"],
                    },
                },
            }
        )

    def put(self, request):
        row = EmailSettings.load()
        data = request.data if isinstance(request.data, dict) else {}
        errors = {}
        row.team_to = ""

        smtp = data.get("smtp")
        if smtp is not None:
            err = self._apply_smtp(row, smtp if isinstance(smtp, dict) else {})
            if err:
                errors["smtp"] = err

        imap = data.get("imap")
        if imap is not None:
            err = self._apply_imap(row, imap if isinstance(imap, dict) else {})
            if err:
                errors["imap"] = err

        if errors:
            return Response(errors, status=400)

        row.save()
        log_action(request.user, AuditLog.Action.UPDATE, row)
        return self.get(request)

    def _apply_smtp(self, row, pkg: dict):
        host = str(pkg.get("host") or "").strip()
        port = str(pkg.get("port") or "").strip()
        user = str(pkg.get("user") or "").strip()
        password = str(pkg.get("password") or "")
        from_email = str(pkg.get("from_email") or pkg.get("from") or "").strip()
        use_user = bool(pkg.get("use_user"))
        if use_user:
            from_email = user

        any_filled = any([host, port, user, password, from_email])
        if not any_filled:
            return "Preencha o pacote SMTP completo, ou use Limpar para voltar ao servidor interno."

        missing = []
        if not host:
            missing.append("host")
        if not port:
            missing.append("porta")
        if not user:
            missing.append("user")
        if not from_email:
            missing.append("from")
        if not password and not row.smtp_password:
            missing.append("senha")
        if missing:
            return (
                "Pacote incompleto. Preencha todos os campos do SMTP "
                f"({', '.join(missing)}) ou deixe tudo em branco e use o servidor interno."
            )
        try:
            port_n = int(port)
        except (TypeError, ValueError):
            return "Porta SMTP inválida."
        if port_n < 1 or port_n > 65535:
            return "Porta SMTP inválida."

        row.smtp_host = host
        row.smtp_port = port_n
        row.smtp_user = user
        row.smtp_from = from_email
        if password:
            row.smtp_password = password
        return None

    def _apply_imap(self, row, pkg: dict):
        host = str(pkg.get("host") or "").strip()
        port = str(pkg.get("port") or "").strip()
        user = str(pkg.get("user") or "").strip()
        password = str(pkg.get("password") or "")
        from_email = str(pkg.get("from_email") or pkg.get("from") or "").strip()
        use_user = bool(pkg.get("use_user"))
        if use_user:
            from_email = user

        any_filled = any([host, port, user, password, from_email])
        if not any_filled:
            return "Preencha o pacote IMAP completo, ou use Limpar para voltar ao servidor interno."

        missing = []
        if not host:
            missing.append("host")
        if not port:
            missing.append("porta")
        if not user:
            missing.append("user")
        if not password and not row.imap_password:
            missing.append("senha")
        if missing:
            return (
                "Pacote incompleto. Preencha todos os campos do IMAP "
                f"({', '.join(missing)}) ou deixe tudo em branco e use o servidor interno."
            )
        try:
            port_n = int(port)
        except (TypeError, ValueError):
            return "Porta IMAP inválida."
        if port_n < 1 or port_n > 65535:
            return "Porta IMAP inválida."

        row.imap_host = host
        row.imap_port = port_n
        row.imap_user = user
        if password:
            row.imap_password = password
        if "ssl" in pkg:
            row.imap_ssl = bool(pkg.get("ssl"))
        else:
            row.imap_ssl = True
        row.imap_allow_self_signed = bool(pkg.get("allow_self_signed"))
        return None


class EmailSettingsDefaultsView(APIView):
    """POST: grava o padrão Kaviski no banco (SMTP e/ou IMAP)."""

    permission_classes = [ModulePermission]
    module = "config"

    def post(self, request):
        which = str(request.data.get("target") or "all").strip().lower()
        row = EmailSettings.load()
        if which in ("smtp", "all"):
            row.smtp_host = KAVISKI_SMTP["host"]
            row.smtp_port = KAVISKI_SMTP["port"]
            row.smtp_user = KAVISKI_SMTP["user"]
            row.smtp_password = KAVISKI_SMTP["password"]
            row.smtp_from = KAVISKI_SMTP["from_email"]
        if which in ("imap", "all"):
            row.imap_host = KAVISKI_IMAP["host"]
            row.imap_port = KAVISKI_IMAP["port"]
            row.imap_user = KAVISKI_IMAP["user"]
            row.imap_password = KAVISKI_IMAP["password"]
            row.imap_ssl = KAVISKI_IMAP["ssl"]
            row.imap_allow_self_signed = KAVISKI_IMAP["allow_self_signed"]
        if which not in ("smtp", "imap", "all"):
            return Response({"detail": "Informe target=smtp, imap ou all."}, status=400)
        row.save()
        log_action(request.user, AuditLog.Action.UPDATE, row)
        return EmailSettingsView().get(request)


class EmailSettingsTestView(APIView):
    """POST test-smtp | test-imap — usa a config efetiva (DB ou padrão)."""

    permission_classes = [ModulePermission]
    module = "config"
    kind = "smtp"

    def post(self, request):
        kind = getattr(self, "kind", "smtp")
        if kind == "imap":
            return self._test_imap()
        return self._test_smtp(request)

    def _test_smtp(self, request):
        if not smtp_ready():
            return Response(
                {"ok": False, "detail": "SMTP não configurado."}, status=400
            )
        cfg = get_smtp_config()
        to = (
            str(request.data.get("to_email") or "").strip()
            or cfg.from_email
            or cfg.user
        )
        try:
            send_email(
                to=to,
                subject="[Sistema] Teste de conexão SMTP",
                body_text=(
                    "Este é um e-mail automático de teste SMTP.\n"
                    "Se você recebeu, a configuração está correta.\n"
                ),
            )
        except MailSendError as exc:
            return Response({"ok": False, "detail": str(exc)}, status=400)
        except Exception as exc:  # noqa: BLE001
            return Response({"ok": False, "detail": f"Erro SMTP: {exc}"}, status=400)
        return Response({"ok": True, "detail": f"SMTP OK — e-mail de teste enviado para {to}."})

    def _test_imap(self):
        if not imap_ready():
            return Response(
                {"ok": False, "detail": "IMAP não configurado."}, status=400
            )
        cfg = get_imap_config()
        try:
            import imaplib
            import ssl

            if cfg.ssl:
                context = ssl.create_default_context()
                if cfg.allow_self_signed:
                    context.check_hostname = False
                    context.verify_mode = ssl.CERT_NONE
                client = imaplib.IMAP4_SSL(
                    cfg.host, cfg.port, ssl_context=context, timeout=25
                )
            else:
                client = imaplib.IMAP4(cfg.host, cfg.port, timeout=25)
            try:
                typ, _ = client.login(cfg.user, cfg.password)
                if typ != "OK":
                    return Response(
                        {"ok": False, "detail": "Login IMAP rejeitado."}, status=400
                    )
                typ, data = client.select("INBOX", readonly=True)
                count = 0
                if typ == "OK" and data and data[0] is not None:
                    try:
                        count = int(data[0])
                    except (TypeError, ValueError):
                        count = 0
                return Response(
                    {
                        "ok": True,
                        "detail": f"IMAP OK — conectado a INBOX ({count} mensagem(ns)).",
                    }
                )
            finally:
                try:
                    client.logout()
                except Exception:  # noqa: BLE001
                    pass
        except Exception as exc:  # noqa: BLE001
            return Response({"ok": False, "detail": f"Erro IMAP: {exc}"}, status=400)


class EmailSettingsClearView(APIView):
    permission_classes = [ModulePermission]
    module = "config"

    def post(self, request):
        which = str(request.data.get("target") or "").strip().lower()
        row = EmailSettings.load()
        if which == "smtp":
            row.smtp_host = ""
            row.smtp_port = None
            row.smtp_user = ""
            row.smtp_password = ""
            row.smtp_from = ""
        elif which == "imap":
            row.imap_host = ""
            row.imap_port = None
            row.imap_user = ""
            row.imap_password = ""
            row.imap_ssl = True
            row.imap_allow_self_signed = True
        else:
            return Response({"detail": "Informe target=smtp ou imap."}, status=400)
        row.save()
        log_action(request.user, AuditLog.Action.UPDATE, row)
        return EmailSettingsView().get(request)
