"""URLs públicas de mídia — evita host Docker interno (ex.: backend:8000)."""

from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings
from rest_framework import serializers

_INTERNAL_HOSTS = frozenset(
    {
        "backend",
        "frontend",
        "db",
        "proxy",
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
    }
)


def _host_is_internal(host: str | None) -> bool:
    h = (host or "").split(":")[0].strip().lower()
    return not h or h in _INTERNAL_HOSTS


def public_base_url(request=None) -> str:
    """Origem pública do site (HTTPS do Nginx), nunca o hostname Docker."""
    configured = (
        getattr(settings, "PUBLIC_BASE_URL", "") or settings.FRONTEND_ORIGIN or ""
    ).strip().rstrip("/")
    if configured:
        parsed = urlparse(configured)
        if parsed.hostname and not _host_is_internal(parsed.hostname):
            return configured
        if configured.startswith(("http://", "https://")):
            return configured

    if request is not None:
        try:
            host = request.get_host()
        except Exception:
            host = ""
        if host and not _host_is_internal(host):
            try:
                return request.build_absolute_uri("/").rstrip("/")
            except Exception:
                pass
    return configured


def absolute_media_url(request, file_or_url) -> str:
    """Monta URL absoluta usável no browser (SSR incluído)."""
    if not file_or_url:
        return ""
    path = file_or_url.url if hasattr(file_or_url, "url") else str(file_or_url)
    if not path:
        return ""

    if path.startswith(("http://", "https://")):
        parsed = urlparse(path)
        if not _host_is_internal(parsed.hostname):
            return path
        path = parsed.path or ""
        if parsed.query:
            path = f"{path}?{parsed.query}"

    if not path.startswith("/"):
        path = f"/{path}"

    base = public_base_url(request)
    if base:
        return f"{base}{path}"

    if request is not None:
        try:
            host = request.get_host()
        except Exception:
            host = ""
        if host and not _host_is_internal(host):
            return request.build_absolute_uri(path)

    # Fallback relativo — o proxy Nginx / rewrite do Next resolve.
    return path


class PublicFileField(serializers.FileField):
    """FileField que nunca devolve host Docker interno."""

    def to_representation(self, value):
        if not value:
            return None
        return absolute_media_url(self.context.get("request"), value) or None


class PublicImageField(serializers.ImageField):
    """ImageField que nunca devolve host Docker interno."""

    def to_representation(self, value):
        if not value:
            return None
        return absolute_media_url(self.context.get("request"), value) or None
