from django.conf import settings
from django.db import models


class Lead(models.Model):
    """Solicitação vinda do formulário público de contratação."""

    name = models.CharField(max_length=200)
    area_atuacao = models.CharField(max_length=120)
    area_outros = models.CharField(max_length=200, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=40)
    message = models.TextField(blank=True)
    category = models.CharField(max_length=80, default="corporativo")
    extra_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_demo = models.BooleanField(
        default=False,
        help_text="Lead de demonstração — pode ser removido em massa no dashboard.",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.email})"

    @property
    def area_display(self):
        if self.area_atuacao == "outros" and self.area_outros:
            return self.area_outros
        return self.area_atuacao

    def get_category_display(self):
        from core.contact_form import normalize_contact_form_config
        from core.models import SiteConfig

        try:
            cfg = normalize_contact_form_config(SiteConfig.load().contact_form_config)
            for item in cfg.get("categories") or []:
                if item.get("id") == self.category:
                    return item.get("label") or self.category
        except Exception:
            pass
        return self.category


class KanbanColumn(models.Model):
    """Coluna do board — totalmente editável (CRUD/reordenar)."""

    title = models.CharField(max_length=120)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=20, default="#64748b")
    is_lost = models.BooleanField(
        default=False,
        help_text="Marca a coluna como 'Perdido' (exige motivo de perda).",
    )
    is_won = models.BooleanField(
        default=False, help_text="Marca a coluna como 'Contrato Fechado'."
    )

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class Label(models.Model):
    name = models.CharField(max_length=60)
    color = models.CharField(max_length=20, default="#f5b301")

    def __str__(self):
        return self.name


class Card(models.Model):
    class Priority(models.TextChoices):
        ALTA = "alta", "Alta"
        MEDIA = "media", "Média"
        BAIXA = "baixa", "Baixa"

    lead = models.OneToOneField(
        Lead, on_delete=models.CASCADE, related_name="card"
    )
    column = models.ForeignKey(
        KanbanColumn, on_delete=models.PROTECT, related_name="cards"
    )
    order = models.PositiveIntegerField(default=0)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIA
    )
    labels = models.ManyToManyField(Label, blank=True, related_name="cards")
    follow_up_date = models.DateField(null=True, blank=True)
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="cards",
    )
    color = models.CharField(max_length=20, blank=True)
    loss_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"Card: {self.lead.name}"


class CardComment(models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class CardNote(models.Model):
    """Anotação interna no card — só o autor (ou admin) pode editar/remover."""

    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="notes"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    text = models.TextField()
    pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pinned", "-created_at"]


class CardChecklistItem(models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="checklist"
    )
    text = models.CharField(max_length=250)
    done = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class CardAttachment(models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="crm/attachments/")
    name = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="card_attachments",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)


class CardHistory(models.Model):
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="history"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    text = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
