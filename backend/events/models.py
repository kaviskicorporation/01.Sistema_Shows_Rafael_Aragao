from datetime import timedelta

from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Event(models.Model):
    class Status(models.TextChoices):
        RASCUNHO = "rascunho", "Rascunho"
        PUBLICADO = "publicado", "Publicado"
        REALIZADO = "realizado", "Realizado"
        OCULTO = "oculto", "Oculto"
        CANCELADO = "cancelado", "Cancelado"

    class HideOverride(models.TextChoices):
        GLOBAL = "global", "Usar regra global"
        IMMEDIATE = "immediate", "Imediatamente após o evento"
        NEXT_DAY = "next_day", "1 dia depois"
        DAYS_AFTER = "days_after", "X dias após o encerramento"
        NEVER = "never", "Nunca ocultar"

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    venue = models.CharField("Local", max_length=200, blank=True)
    city = models.CharField(max_length=120)
    state = models.CharField(max_length=2)
    tickets_link = models.URLField(blank=True)
    external_link = models.URLField(blank=True)
    description = models.TextField(blank=True)
    banner = models.ImageField(upload_to="events/", blank=True, null=True)
    banner_url = models.URLField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RASCUNHO
    )
    internal_notes = models.TextField(blank=True)

    # Ocultação granular (override individual sobre a regra global)
    hide_override = models.CharField(
        max_length=20, choices=HideOverride.choices, default=HideOverride.GLOBAL
    )
    hide_days_after = models.PositiveIntegerField(default=1)

    # Sessões extras: um evento pode referenciar um "pai" (mesmo espetáculo)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "time"]

    def __str__(self):
        return f"{self.name} — {self.city}/{self.state} ({self.date})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.name}-{self.city}-{self.date}")
            slug = base
            i = 2
            while Event.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def hidden_after(self, site_config):
        """Datetime after which the event should disappear from the public site.

        Returns None when it should never be hidden by rule.
        """
        rule = self.hide_override
        days = self.hide_days_after
        if rule == self.HideOverride.GLOBAL:
            rule = site_config.hide_rule
            days = site_config.hide_days_after
        if rule == self.HideOverride.NEVER:
            return None

        end = timezone.make_aware(
            timezone.datetime.combine(
                self.date, self.time or timezone.datetime.min.time()
            )
        )
        if rule in ("immediate", self.HideOverride.IMMEDIATE):
            return end
        if rule in ("next_day", self.HideOverride.NEXT_DAY):
            return end + timedelta(days=1)
        if rule in ("days_after", self.HideOverride.DAYS_AFTER):
            return end + timedelta(days=days)
        return end + timedelta(days=1)

    def is_public_visible(self, site_config, now=None):
        if self.status != self.Status.PUBLICADO:
            return False
        now = now or timezone.now()
        hide_at = self.hidden_after(site_config)
        if hide_at is None:
            return True
        return now < hide_at


class EventImage(models.Model):
    """Galeria: até 3 imagens extras por evento (lightbox na página pública)."""

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="gallery"
    )
    image = models.ImageField(upload_to="events/gallery/", blank=True, null=True)
    image_url = models.URLField(blank=True)
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"Imagem de {self.event.name}"


class EventTemplate(models.Model):
    """Modelo reutilizável de evento (turnês)."""

    name = models.CharField(max_length=200)
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
