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
    hero_subtitle = models.CharField(
        max_length=300, default="Rei dos Peão — Humorista"
    )
    hero_image = models.ImageField(upload_to="site/", blank=True, null=True)
    hero_image_url = models.CharField(max_length=500, blank=True)
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

    # Formulário público de contratação (campos, áreas, tipos)
    contact_form_config = models.JSONField(default=dict, blank=True)

    # Vídeo em destaque (YouTube) na home
    featured_video_url = models.CharField(
        max_length=500,
        blank=True,
        default="https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
    )

    # Dados de demonstração no painel (leads/CRM fake)
    demo_data_active = models.BooleanField(default=False)

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
