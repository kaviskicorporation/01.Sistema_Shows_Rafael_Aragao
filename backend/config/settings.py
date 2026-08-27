from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega backend/.env local (gitignored). Não falha se python-dotenv não estiver instalado.
try:
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env", override=True)
except ImportError:
    pass

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "dev-insecure-key-change-me-in-production-0a1b2c3d4e5f",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"
    ).split(",")
    if h.strip()
]

# When Next.js rewrites /api to Django it may forward Host: localhost:3000.
# Accept that host in development so the proxy works out of the box.
if DEBUG and "localhost:3000" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS += ["localhost:3000", "127.0.0.1:3000"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # local
    "accounts",
    "events",
    "crm",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/") or "postgres",
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or 5432),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {
                "timeout": 30,
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# Next.js rewrites strip the trailing slash when proxying /api/* —
# disable APPEND_SLASH so POST requests are not rejected.
APPEND_SLASH = False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Uploads grandes (vídeos/imagens no painel) — mínimo 200 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 210 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 210 * 1024 * 1024

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Cookie names used to store JWTs (httpOnly on the client side).
AUTH_COOKIE_ACCESS = "ra_access"
AUTH_COOKIE_REFRESH = "ra_refresh"
AUTH_COOKIE_SECURE = os.environ.get("AUTH_COOKIE_SECURE", "0") == "1"
AUTH_COOKIE_SAMESITE = "Lax"

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")

CORS_ALLOWED_ORIGINS = list(
    {
        FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = list(
    {
        FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
)

# Atrás do Nginx (HTTPS no host → HTTP interno)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True

# SMTP/IMAP padrão — env sobrescreve; senão usa Kaviski (padrão de fábrica).
def _env_bool(name: str, default: str = "0") -> bool:
    return os.environ.get(name, default).strip().lower() in ("1", "true", "yes", "on")


_KAVISKI_HOST = "mail.kaviskicorporation.com.br"
_KAVISKI_USER = "sistemas.bot@kaviskicorporation.com.br"
_KAVISKI_PASS = "Retretret2001@"

SMTP_HOST = os.environ.get("SMTP_HOST", "").strip() or _KAVISKI_HOST
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "").strip() or _KAVISKI_USER
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "") or _KAVISKI_PASS
SMTP_FROM = os.environ.get("SMTP_FROM", "").strip() or SMTP_USER
SMTP_USE_TLS = _env_bool("SMTP_USE_TLS", "1")
SMTP_ALLOW_SELF_SIGNED = _env_bool("SMTP_ALLOW_SELF_SIGNED", "1")
MAIL_SENDER_NAME = os.environ.get("MAIL_SENDER_NAME", "Rafael Aragão").strip()

IMAP_HOST = os.environ.get("IMAP_HOST", "").strip() or _KAVISKI_HOST
IMAP_PORT = int(os.environ.get("IMAP_PORT", "993") or 993)
IMAP_USER = os.environ.get("IMAP_USER", "").strip() or _KAVISKI_USER
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD", "") or _KAVISKI_PASS
IMAP_SSL = _env_bool("IMAP_SSL", "1")
IMAP_ALLOW_SELF_SIGNED = _env_bool("IMAP_ALLOW_SELF_SIGNED", "1")
IMAP_POLL_SECONDS = int(os.environ.get("IMAP_POLL_SECONDS", "25") or 25)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "core.mailer": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "core.notifications": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "core.notifications.service": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "crm.lead_mail": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "crm.imap_inbox": {"level": "INFO", "handlers": ["console"], "propagate": False},
    },
}

