# Deploy produção (Docker) — resumo operacional
#
# Local (Windows): .\start.bat  → SQLite + Next :3000 + Django :8000 (sem Docker)
#
# Servidor:
#   pasta: ~/Projetos/Clientes/18-Santiago_Producoes/01.Sistema_Shows_Rafael_Aragao
#   porta interna: 127.0.0.1:9026  (Nginx host → aragao.kaviskicorporation.com.br)
#
# Primeira vez no Ubuntu:
#   1. Docker Engine + plugin compose
#   2. Deploy key (read-only) no GitHub → clone nesta pasta
#   3. cp deploy/env.example deploy/.env  e edite secrets
#   4. docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
#   5. Aplique deploy/nginx-host.conf em /etc/nginx/sites-available/aragao.conf
#      sudo nginx -t && sudo systemctl reload nginx
#
# GitHub Secrets (Actions):
#   DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY  (+ opcional DEPLOY_PORT)
#
# Push na main dispara o workflow .github/workflows/deploy.yml
