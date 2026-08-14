from datetime import date, time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.demo_data import DEMO_LEADS
from core.models import Notification, SiteConfig
from crm.models import Card, CardHistory, KanbanColumn, Label, Lead
from events.models import Event

User = get_user_model()

REIDOSPEAO = "/images/rei-dos-peao.png"

AGENDA = [
    (date(2026, 8, 7), "Araucária", "PR"),
    (date(2026, 8, 29), "Curitiba", "PR"),
    (date(2026, 9, 3), "Lençóis Paulista", "SP"),
    (date(2026, 9, 4), "Botucatu", "SP"),
    (date(2026, 9, 5), "Bauru", "SP"),
    (date(2026, 9, 10), "Brusque", "SC"),
    (date(2026, 9, 11), "Lages", "SC"),
    (date(2026, 9, 12), "Criciúma", "SC"),
    (date(2026, 9, 13), "Florianópolis", "SC"),
    (date(2026, 10, 1), "Itajaí", "SC"),
    (date(2026, 10, 2), "Blumenau", "SC"),
    (date(2026, 10, 3), "Joinville", "SC"),
    (date(2026, 10, 4), "Jaraguá do Sul", "SC"),
    (date(2026, 10, 8), "São José dos Pinhais", "PR"),
    (date(2026, 10, 9), "Telêmaco Borba", "PR"),
    (date(2026, 10, 10), "Guarapuava", "PR"),
    (date(2026, 10, 11), "Ponta Grossa", "PR"),
    (date(2026, 10, 14), "Lorena", "SP"),
    (date(2026, 10, 15), "Sorocaba", "SP"),
    (date(2026, 10, 16), "Atibaia", "SP"),
    (date(2026, 10, 17), "Bragança Paulista", "SP"),
    (date(2026, 10, 30), "Maringá", "PR"),
    (date(2026, 10, 31), "Cornélio Procópio", "PR"),
    (date(2026, 11, 1), "Londrina", "PR"),
    (date(2026, 11, 12), "Caxias do Sul", "RS"),
    (date(2026, 11, 13), "Novo Hamburgo", "RS"),
    (date(2026, 11, 14), "Pelotas", "RS"),
    (date(2026, 11, 15), "Porto Alegre", "RS"),
    (date(2026, 11, 26), "Erechim", "RS"),
    (date(2026, 11, 27), "Carazinho", "RS"),
    (date(2026, 12, 5), "Gravataí", "RS"),
]

COLUMNS = [
    ("Novo Lead", "#3b82f6", False, False),
    ("Primeiro Contato", "#8b5cf6", False, False),
    ("Negociação", "#f59e0b", False, False),
    ("Aguardando Retorno", "#eab308", False, False),
    ("Proposta Enviada", "#06b6d4", False, False),
    ("Contrato Fechado", "#22c55e", False, True),
    ("Perdido", "#ef4444", True, False),
]

LABELS = [
    ("Corporativo", "#f5b301"),
    ("Prioridade", "#ef4444"),
    ("Recorrente", "#22c55e"),
    ("Prefeitura", "#3b82f6"),
]


class Command(BaseCommand):
    help = "Popula o banco com dados iniciais (agenda, Kanban, admin, demo CRM)."

    def handle(self, *args, **options):
        # Remove usuários de exemplo antigos
        removed, _ = User.objects.filter(
            username__in=["gerente", "comercial", "visualizador"]
        ).delete()
        if removed:
            self.stdout.write(self.style.WARNING(f"Removidos {removed} usuários de exemplo."))

        # Só o admin
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@rafaelaragao.local",
                password="admin12345",
                role=User.Role.ADMIN,
                first_name="Administrador",
            )
            self.stdout.write(self.style.SUCCESS("Usuário admin criado (admin / admin12345)."))
        else:
            admin = User.objects.get(username="admin")
            admin.role = User.Role.ADMIN
            admin.is_staff = True
            admin.is_superuser = True
            admin.set_password("admin12345")
            admin.save()

        config = SiteConfig.load()
        config.hero_title = "Rafael Aragão"
        config.hero_subtitle = "Rei dos Peão — O humorista que lota teatros pelo Brasil"
        config.hero_image_url = REIDOSPEAO
        config.about_title = "Sobre o Artista"
        config.about_text = (
            "Rafael Aragão é um dos maiores nomes do humor nacional. Com o espetáculo "
            '"Rei dos Peão", leva gargalhadas a plateias por todo o país, misturando '
            "observações do cotidiano, causos e muita irreverência."
        )
        config.about_image_url = "/images/aragones.png"
        config.instagram = "https://instagram.com/orafaelaragao"
        config.youtube = "https://youtube.com/@orafaelaragao"
        config.spotify = "https://open.spotify.com/"
        config.contact_email = "contato@rafaelaragao.com.br"
        config.footer_text = "Rafael Aragão — Rei dos Peão"
        config.seo_title = "Rafael Aragão — Rei dos Peão | Humorista"
        config.seo_description = (
            "Agenda de shows, contratação e informações do humorista Rafael Aragão."
        )
        config.featured_video_url = (
            "https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s"
        )
        config.save()

        for i, (title, color, is_lost, is_won) in enumerate(COLUMNS):
            KanbanColumn.objects.get_or_create(
                title=title,
                defaults={"order": i, "color": color, "is_lost": is_lost, "is_won": is_won},
            )

        for name, color in LABELS:
            Label.objects.get_or_create(name=name, defaults={"color": color})

        if Event.objects.count() == 0:
            for d, city, state in AGENDA:
                Event.objects.create(
                    name="Rei dos Peão",
                    date=d,
                    time=time(21, 0),
                    venue="Teatro Municipal",
                    city=city,
                    state=state,
                    status=Event.Status.PUBLICADO,
                    banner_url=REIDOSPEAO,
                    description="Espetáculo de humor com Rafael Aragão.",
                    tickets_link="https://www.sympla.com.br/",
                )
            self.stdout.write(self.style.SUCCESS(f"{len(AGENDA)} eventos criados."))

        # Dados demo CRM (se ainda não houver leads demo)
        if not Lead.objects.filter(is_demo=True).exists():
            columns = list(KanbanColumn.objects.order_by("order"))
            label_corp = Label.objects.filter(name="Corporativo").first()
            label_prio = Label.objects.filter(name="Prioridade").first()
            for i, (name, area, _t, email, phone, cat, col_idx, prio) in enumerate(DEMO_LEADS):
                col = columns[min(col_idx, len(columns) - 1)] if columns else None
                if not col:
                    break
                lead = Lead.objects.create(
                    name=name,
                    area_atuacao=area,
                    email=email,
                    phone=phone,
                    category=cat,
                    message="[DEMO] Interesse em contratar o espetáculo Rei dos Peão.",
                    is_demo=True,
                )
                card = Card.objects.create(lead=lead, column=col, order=i, priority=prio)
                if label_corp:
                    card.labels.add(label_corp)
                if label_prio and prio == "alta":
                    card.labels.add(label_prio)
                CardHistory.objects.create(
                    card=card, text="[DEMO] Lead de demonstração criado."
                )
            config.demo_data_active = True
            config.save(update_fields=["demo_data_active", "updated_at"])
            Notification.objects.create(
                title="Dados de demonstração ativos",
                message="O dashboard/CRM têm leads demo. Remova no Dashboard antes de entregar.",
                link="/admin",
            )
            self.stdout.write(self.style.SUCCESS("Leads de demonstração criados."))

        self.stdout.write(self.style.SUCCESS("Seed concluído."))
