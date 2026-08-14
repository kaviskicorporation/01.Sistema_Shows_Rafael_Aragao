from django.conf import settings
from django.db import models


class SiteConfig(models.Model):
    """Singleton holding public site configuration."""

    class HideRule(models.TextChoices):
        IMMEDIATE = "immediate", "Imediatamente após o evento"
        NEXT_DAY = "next_day", "1 dia depois"
        DAYS_AFTER = "days_after", "X dias após o encerramento"

    # Hero
    hero_title = models.CharField(max_length=200, default="Rafael Aragão")
    hero_subtitle_lead = models.CharField(
        max_length=80, default="Espetáculo", blank=True
    )
    hero_subtitle = models.CharField(
        max_length=300,
        default="O artista que lota teatros pelo Brasil",
    )
    hero_image = models.ImageField(upload_to="site/", blank=True, null=True)
    hero_image_url = models.CharField(max_length=500, blank=True)
    hero_wordmark = models.CharField(max_length=80, default="Rei dos Peão")
    hero_badge = models.CharField(
        max_length=80, default="Ao vivo · Turnê {year}"
    )
    hero_cta_primary = models.CharField(max_length=60, default="Ver agenda")
    hero_cta_secondary = models.CharField(
        max_length=60, default="Contratar show"
    )
    hero_cta_icon_primary = models.CharField(
        max_length=40, default="calendar-days"
    )
    hero_cta_icon_secondary = models.CharField(
        max_length=40, default="handshake"
    )
    hero_next_label = models.CharField(max_length=60, default="Próximo show")
    hero_scroll_label = models.CharField(max_length=40, default="Role")
    nav_cta = models.CharField(max_length=60, default="Faça seu evento")
    nav_icon_cta = models.CharField(max_length=40, default="sparkles")
    nav_label_agenda = models.CharField(max_length=40, default="Agenda")
    nav_icon_agenda = models.CharField(max_length=40, default="calendar-days")
    nav_label_sobre = models.CharField(max_length=40, default="Sobre")
    nav_icon_sobre = models.CharField(max_length=40, default="user-round")
    nav_label_video = models.CharField(max_length=40, default="Vídeo")
    nav_icon_video = models.CharField(max_length=40, default="clapperboard")
    nav_label_contato = models.CharField(max_length=40, default="Contratação")
    nav_icon_contato = models.CharField(max_length=40, default="handshake")
    hero_tag_1 = models.CharField(max_length=60, default="Humor de palco")
    hero_tag_2 = models.CharField(max_length=60, default="Turnê nacional")
    hero_tag_3 = models.CharField(max_length=60, default="Agenda {year}")
    hero_tag_4 = models.CharField(max_length=60, default="Teatros lotados")
    primary_color = models.CharField(max_length=20, default="#f5b301")
    secondary_color = models.CharField(max_length=20, default="#0f0f0f")

    # Sobre
    about_title = models.CharField(max_length=200, default="Sobre o Artista")
    about_text = models.TextField(blank=True)
    about_image = models.ImageField(upload_to="site/", blank=True, null=True)
    about_image_url = models.CharField(max_length=500, blank=True)

    # Social (CharField: aceita URL completa ou relativa)
    instagram = models.CharField(max_length=500, blank=True)
    youtube = models.CharField(max_length=500, blank=True)
    spotify = models.CharField(max_length=500, blank=True)
    tiktok = models.CharField(max_length=500, blank=True)
    facebook = models.CharField(max_length=500, blank=True)

    # Footer
    footer_text = models.CharField(max_length=300, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=40, blank=True)

    # SEO / Open Graph
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)
    og_image = models.ImageField(upload_to="site/", blank=True, null=True)
    og_image_url = models.CharField(max_length=500, blank=True)

    # Ocultação automática de eventos passados (regra global)
    hide_rule = models.CharField(
        max_length=20, choices=HideRule.choices, default=HideRule.NEXT_DAY
    )
    hide_days_after = models.PositiveIntegerField(default=1)

    class AgendaDefaultView(models.TextChoices):
        CALENDAR = "calendar", "Calendário"
        LIST = "list", "Lista"

    # Modo inicial da agenda pública
    agenda_default_view = models.CharField(
        max_length=20,
        choices=AgendaDefaultView.choices,
        default=AgendaDefaultView.CALENDAR,
    )
    # Quantos shows a lista mostra por vez ("Ver mais")
    agenda_list_page_size = models.PositiveIntegerField(default=20)

    # Formulário público de contratação (campos, áreas, tipos)
    contact_form_config = models.JSONField(default=dict, blank=True)

    # Textos e fundo da seção Contratação (home)
    contact_eyebrow = models.CharField(max_length=80, default="Contratação")
    contact_title_line1 = models.CharField(
        max_length=120, default="FAÇA SEU EVENTO"
    )
    contact_title_line2 = models.CharField(
        max_length=120, default="CORPORATIVO"
    )
    contact_scroll_hint = models.CharField(
        max_length=160, default="Role para revelar o formulário"
    )
    contact_bg_image = models.ImageField(
        upload_to="site/", blank=True, null=True
    )
    contact_bg_image_url = models.CharField(
        max_length=500, blank=True, default="/images/rei-dos-peao.png"
    )

    # Vídeo em destaque (YouTube) na home
    featured_video_url = models.CharField(
        max_length=500,
        blank=True,
        default="https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
    )

    # Dados de demonstração no painel (leads/CRM fake)
    demo_data_active = models.BooleanField(default=False)

    # Seção patrocinadores (título da faixa na home)
    sponsors_title = models.CharField(
        max_length=80, blank=True, default="Patrocinadores"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do site"
        verbose_name_plural = "Configuração do site"

    def __str__(self):
        return "Configuração do site"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class Sponsor(models.Model):
    """Marca/patrocinador exibido na home."""

    name = models.CharField(max_length=120)
    text_mark = models.CharField(
        max_length=40,
        blank=True,
        help_text="Texto em destaque quando não há logo (ex.: CDC).",
    )
    image = models.ImageField(upload_to="sponsors/", blank=True, null=True)
    image_url = models.CharField(
        max_length=500,
        blank=True,
        help_text="URL/caminho do logo (alternativa ao upload).",
    )
    link = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Patrocinador"
        verbose_name_plural = "Patrocinadores"

    def __str__(self):
        return self.name


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Criação"
        UPDATE = "update", "Edição"
        DELETE = "delete", "Exclusão"
        LOGIN = "login", "Login"
        MOVE = "move", "Movimentação"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_display()} {self.model_name} #{self.object_id}"


class Notification(models.Model):
    """Internal bell notifications (e.g. novos leads)."""

    title = models.CharField(max_length=160)
    message = models.CharField(max_length=300, blank=True)
    link = models.CharField(max_length=200, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
