#!/bin/sh
set -e

echo "Aguardando Postgres..."
python - <<'PY'
import os, time, sys
from urllib.parse import urlparse

url = os.environ.get("DATABASE_URL", "")
if not url:
    sys.exit(0)

try:
    import psycopg
except ImportError:
    sys.exit(0)

parsed = urlparse(url)
for i in range(60):
    try:
        with psycopg.connect(
            dbname=parsed.path.lstrip("/") or "postgres",
            user=parsed.username or "",
            password=parsed.password or "",
            host=parsed.hostname or "",
            port=parsed.port or 5432,
            connect_timeout=3,
        ):
            print("Postgres OK.")
            break
    except Exception as e:
        print(f"  tentativa {i+1}/60: {e}")
        time.sleep(2)
else:
    print("Postgres indisponível.", file=sys.stderr)
    sys.exit(1)
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed só na primeira subida (sem usuário admin)
python - <<'PY'
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.core.management import call_command

User = get_user_model()
if not User.objects.filter(username="admin").exists():
    print("Primeira subida: rodando seed...")
    call_command("seed")
else:
    print("Admin já existe — seed ignorado.")
PY

exec "$@"
