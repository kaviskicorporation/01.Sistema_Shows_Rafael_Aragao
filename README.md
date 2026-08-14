# Site Rafael Aragão — Plataforma Web Completa

Plataforma web do humorista **Rafael Aragão** (Rei dos Peão): site público moderno com agenda de shows + painel administrativo com CRUD de eventos, formulário de contratação e CRM Kanban customizável.

## Stack

| Camada   | Tecnologia                                      |
|----------|--------------------------------------------------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind  |
| Backend  | Django 5 + Django REST Framework + SimpleJWT     |
| Banco    | SQLite (dev) — pronto para PostgreSQL em produção |

## Estrutura

```
├── backend/          # API Django
├── frontend/         # Site público + painel /admin
├── docs/             # Orçamento e documentos
└── README.md
```

## Pré-requisitos

- Python 3.11+ (`py` no Windows)
- Node.js 20+ e npm

## Como rodar (desenvolvimento)

### 1. Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

API disponível em `http://localhost:8000`.

### 2. Frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

Site disponível em `http://localhost:3000`.

O Next.js faz proxy automático de `/api/*` e `/media/*` para o Django.

## Credenciais iniciais (seed)

| Usuário        | Senha           | Perfil         |
|----------------|-----------------|----------------|
| `admin`        | `admin12345`    | Administrador  |
| `gerente`      | `gerente12345`  | Gerente        |
| `comercial`    | `comercial12345`| Comercial      |
| `visualizador` | `visual12345`   | Visualizador   |

## Rotas principais

### Público (sem link para admin)

- `/` — Home (hero, agenda, sobre, patrocinadores, formulário)
- `/shows/[slug]` — Página do evento

### Admin (acesso **somente** via URL `/admin`)

- `/admin/login` — Login
- `/admin` — Dashboard (KPIs, gráficos, timeline)
- `/admin/eventos` — CRUD + calendário + lote
- `/admin/crm` — Kanban editável (colunas, drag-and-drop)
- `/admin/usuarios` — Usuários e perfis
- `/admin/auditoria` — Logs + exportação CSV
- `/admin/configuracoes` — Hero, SEO, redes, regra de ocultação

## Funcionalidades-chave

- **Agenda automática**: eventos publicados aparecem no site; somem sozinhos após a data conforme regra global (ou override por evento).
- **Formulário "Faça seu evento corporativo"**: nome, área (select + "Outros" em texto), e-mail, telefone, mensagem opcional; gera card no Kanban.
- **CRM Kanban**: colunas 100% editáveis (CRUD/reordenar/cores), prioridade, follow-up, checklist, comentários, motivo de perda obrigatório.
- **Perfis**: Admin, Gerente, Comercial, Visualizador com permissões por módulo.
- **Auditoria**: quem/quando/o quê em todas as ações críticas.
- **Exportações**: CSV de eventos/leads, PDF do dashboard, CSV de auditoria.

## Seed de dados

O comando `python manage.py seed` cria:

- Usuários por perfil
- 31 shows da agenda 2026 (extraídos de orafaelaragao.com.br)
- 7 colunas do Kanban
- Configuração do site com arte "Rei dos Peão"
- Leads de exemplo

## Notas

- Em produção, troque `SECRET_KEY`, use PostgreSQL e configure `AUTH_COOKIE_SECURE=1` com HTTPS.
- Imagens do site atual são referenciadas via URL (`orafaelaragao.com.br`); você pode substituí-las pelo upload no painel.
