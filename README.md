# Site Rafael Aragão — Plataforma Web

Plataforma do humorista **Rafael Aragão** (Rei dos Peão): site público com agenda de shows e painel administrativo (eventos, CRM Kanban, formulário de contratação, equipe e auditoria).

Produção: [aragao.kaviskicorporation.com.br](https://aragao.kaviskicorporation.com.br)

## Stack

| Camada   | Tecnologia |
|----------|------------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + Framer Motion |
| Backend  | Django 5 + Django REST Framework + SimpleJWT |
| Banco    | SQLite no desenvolvimento · PostgreSQL no Docker de produção |

## Estrutura

```
├── backend/                 # API Django
├── frontend/                # Site público + painel /admin
├── deploy/                  # Docker Compose, Dockerfiles, Nginx, .env.example
├── .github/workflows/       # Deploy automático na main
├── start.bat / start.ps1    # Sobe front + back no Windows
└── README.md
```

## Como rodar (desenvolvimento)

### Primeira vez

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed

cd ..\frontend
npm install
```

### Subir tudo

Na raiz do projeto:

```powershell
.\start.bat
```

Sobe o Django em `127.0.0.1:8000` e o Next.js em `http://localhost:3000`. **Ctrl+C** encerra os dois.

| Serviço | URL |
|---------|-----|
| Site    | http://localhost:3000 |
| Painel  | http://localhost:3000/admin |
| API     | http://127.0.0.1:8000 |

O Next.js faz proxy de `/api/*` e `/media/*` para o Django.

Para subir na mão, em dois terminais:

```powershell
# backend
cd backend
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

# frontend
cd frontend
npm run dev
```

## Credenciais (seed)

Na tela de login dá para entrar digitando ou com um clique nos quatro perfis.

| Usuário        | Senha            | Perfil                      |
|----------------|------------------|-----------------------------|
| `admin`        | `admin12345`     | Administrador (acesso total)|
| `gerente`      | `gerente12345`   | Gerente                     |
| `comercial`    | `comercial12345` | Comercial                   |
| `visualizador` | `visual12345`    | Somente leitura             |

## Site público

- **Home** (`/`) — hero, agenda, sobre, vídeo, patrocinadores e formulário de contratação
- **Show** (`/shows/[slug]`) — detalhe do evento, countdown e link de ingressos
- Sem link visível para o admin: o painel só abre em `/admin`

O que o visitante vê é editável no painel (textos, foto, cores, menu, ícones dos botões, formulário, patrocinadores, SEO).

## Painel (`/admin`)

Cada aba do menu tem cor própria. O que cada usuário vê depende das permissões.

| Rota | Função |
|------|--------|
| `/admin/login` | Login (formulário + atalhos dos 4 perfis) |
| `/admin` | Dashboard: KPIs, próximo show, leads, gráficos, timeline |
| `/admin/eventos` | CRUD de shows, calendário, publicação em lote, fundo do card |
| `/admin/crm` | Kanban: colunas, prioridade, follow-up, chat, anotações, checklist, anexos |
| `/admin/formulario-contato` | Textos, foto de fundo, campos, áreas e tipos de evento |
| `/admin/usuarios` | Equipe: logins e permissões por aba |
| `/admin/auditoria` | Histórico de ações + CSV |
| `/admin/configuracoes` | Hero, menu, cores, redes, SEO, patrocinadores, ocultação |

### Configurações do site (destaques)

- Textos e foto da primeira tela
- Textos **e ícones** dos botões *Ver agenda* e *Contratar show*
- Ícones e rótulos do menu
- Cores primária/secundária
- Agenda pública: calendário ou lista, quantidade por página
- Ocultação automática de shows passados (global ou por evento)

## Funcionalidades

- **Agenda automática** — shows publicados entram no site e saem sozinhos depois da data (regra global ou override)
- **Formulário de contratação** — gera lead/card no Kanban; campos e listas são configuráveis
- **CRM Kanban** — colunas editáveis, drag-and-drop, WhatsApp/e-mail no card, motivo de perda obrigatório
- **Perfis** — Admin, Gerente, Comercial e Visualizador, com módulos marcáveis
- **Auditoria** — quem / quando / o quê nas ações críticas
- **Exportações** — CSV de eventos e leads, PDF do dashboard, CSV de auditoria

## Seed

`python manage.py seed` (na pasta `backend`) cria:

- Os 4 usuários acima
- 31 shows da agenda 2026
- Colunas do Kanban
- Configuração do site (arte Rei dos Peão, textos e ícones padrão)
- Leads de demonstração (o admin pode carregar/remover a simulação no dashboard)

## Produção (Docker)

Push na `main` dispara o deploy (GitHub Actions → SSH no Ubuntu). No servidor o stack sobe com Docker Compose + PostgreSQL, exposto em `127.0.0.1:9026` e publicado pelo Nginx em `aragao.kaviskicorporation.com.br`.

Detalhes operacionais: [`deploy/README.md`](deploy/README.md).

Primeira vez no servidor:

1. Docker Engine + plugin Compose
2. Clone com deploy key (somente leitura) do GitHub
3. `cp deploy/env.example deploy/.env` e preencha os secrets
4. `docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build`
5. Aplique `deploy/nginx-host.conf` em `/etc/nginx/sites-available/aragao.conf` e recarregue o Nginx

Secrets do GitHub Actions: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

No `.env` de produção: `DJANGO_SECRET_KEY`, senha do Postgres e `AUTH_COOKIE_SECURE=1` (HTTPS).
