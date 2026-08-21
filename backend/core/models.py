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

    # Seção FAQ na home (abaixo do formulário)
    faq_eyebrow = models.CharField(
        max_length=80, blank=True, default="Dúvidas"
    )
    faq_title = models.CharField(
        max_length=120, blank=True, default="Perguntas frequentes"
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


class FaqItem(models.Model):
    """Pergunta e resposta do FAQ público — 100% gerenciado pelo /admin."""

    question = models.CharField(max_length=300)
    answer = models.TextField(
        help_text="Texto da resposta. URLs viram link; HTML <a href> também vale."
    )
    icon = models.CharField(max_length=40, default="help-circle", blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Pergunta do FAQ"
        verbose_name_plural = "FAQ"

    def __str__(self):
        return self.question[:80]


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


class EmailSettings(models.Model):
    """Singleton: override SMTP/IMAP do cliente + To da equipe.

    Pacote vazio = fallback secreto do .env. Senhas nunca saem na API.
    """

    smtp_host = models.CharField(max_length=200, blank=True)
    smtp_port = models.PositiveIntegerField(null=True, blank=True)
    smtp_user = models.CharField(max_length=200, blank=True)
    smtp_password = models.CharField(max_length=300, blank=True)
    smtp_from = models.CharField(max_length=200, blank=True)

    imap_host = models.CharField(max_length=200, blank=True)
    imap_port = models.PositiveIntegerField(null=True, blank=True)
    imap_user = models.CharField(max_length=200, blank=True)
    imap_password = models.CharField(max_length=300, blank=True)
    imap_ssl = models.BooleanField(default=True)
    imap_allow_self_signed = models.BooleanField(default=True)

    team_to = models.EmailField(blank=True)

    imap_uidvalidity = models.BigIntegerField(null=True, blank=True)
    imap_last_uid = models.BigIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração de e-mail"

    def __str__(self):
        return "E-mails e alertas"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def smtp_package_complete(self) -> bool:
        return bool(
            self.smtp_host.strip()
            and self.smtp_port
            and self.smtp_user.strip()
            and self.smtp_password
            and self.smtp_from.strip()
        )

    def imap_package_complete(self) -> bool:
        return bool(
            self.imap_host.strip()
            and self.imap_port
            and self.imap_user.strip()
            and self.imap_password
        )


class Notification(models.Model):
    """Sino do /admin — uma linha por usuário (não é o chat do CRM)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_type = models.CharField(max_length=80, blank=True, db_index=True)
    dedupe_key = models.CharField(max_length=180, blank=True)
    title = models.CharField(max_length=160)
    message = models.CharField(max_length=300, blank=True)
    link = models.CharField(max_length=200, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "event_type", "dedupe_key"],
                name="uniq_notif_user_event_dedupe",
            )
        ]

    def __str__(self):
        return self.title


class NotificationPreference(models.Model):
    """Matriz: quem recebe in-app (por perfil) e se dispara e-mail externo."""

    event_type = models.CharField(max_length=80, unique=True)
    notify_admin = models.BooleanField(default=True)
    notify_gerente = models.BooleanField(default=False)
    notify_comercial = models.BooleanField(default=False)
    notify_visualizador = models.BooleanField(default=False)
    send_email = models.BooleanField(default=False)
    email_recipient_ids = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["event_type"]

    def __str__(self):
        return self.event_type


class NotificationRecipient(models.Model):
    """Endereços que recebem avisos da plataforma (não é a mailbox SMTP/IMAP)."""

    email = models.EmailField(unique=True)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_primary", "id"]

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        self.email = (self.email or "").strip().lower()
        super().save(*args, **kwargs)
        if self.is_primary:
            type(self).objects.exclude(pk=self.pk).filter(is_primary=True).update(
                is_primary=False
            )


class NotificationTemplate(models.Model):
    """Assunto/corpo personalizados. is_custom=False usa o padrão do código."""

    event_type = models.CharField(max_length=80, unique=True)
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField(blank=True)
    is_custom = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.event_type


class NotificationDispatchLog(models.Model):
    """Auditoria do disparo — sem credenciais."""

    event_type = models.CharField(max_length=80, db_index=True)
    dedupe_key = models.CharField(max_length=180, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notification_dispatches",
    )
    in_app_user_ids = models.JSONField(default=list, blank=True)
    email_to = models.JSONField(default=list, blank=True)
    email_sent = models.BooleanField(default=False)
    error = models.CharField(max_length=400, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} @ {self.created_at}"
