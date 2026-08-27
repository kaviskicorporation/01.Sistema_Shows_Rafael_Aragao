"""Catálogo central de eventos da plataforma. Novos tipos entram só aqui."""

from __future__ import annotations

from dataclasses import dataclass


GROUP_CRM = "crm"
GROUP_EVENTS = "events"
GROUP_FORMS = "forms"
GROUP_USERS = "users"
GROUP_SYSTEM = "system"

GROUP_LABELS = {
    GROUP_CRM: "CRM",
    GROUP_EVENTS: "Eventos",
    GROUP_FORMS: "Formulários",
    GROUP_USERS: "Equipe",
    GROUP_SYSTEM: "Sistema",
}

CRM_MESSAGE_RECEIVED = "crm.message.received"
CRM_MESSAGE_BOUNCE = "crm.message.bounce"
CRM_MESSAGE_SENT = "crm.message.sent"
CRM_LEAD_CREATED = "crm.lead.created"
EVENT_CREATED = "event.created"
EVENT_UPDATED = "event.updated"
EVENT_DELETED = "event.deleted"
FORM_UPDATED = "form.updated"
USER_CREATED = "user.created"
USER_UPDATED = "user.updated"
USER_DELETED = "user.deleted"
CONFIGURATION_UPDATED = "configuration.updated"


@dataclass(frozen=True)
class EventSpec:
    key: str
    label: str
    group: str
    placeholders: tuple[str, ...]
    default_subject: str
    default_body: str
    in_app_title: str
    in_app_message: str
    notify_admin: bool = True
    notify_gerente: bool = False
    notify_comercial: bool = False
    notify_visualizador: bool = False
    send_email: bool = False
    skip_actor: bool = True


ACCESS_LINK = "\n\nPara acessar, use o link:\n{{link}}"


def _ph(*names: str) -> tuple[str, ...]:
    base = ("actorName", "date", "link")
    extra = tuple(n for n in names if n not in base)
    return base + extra


EVENTS: dict[str, EventSpec] = {
    CRM_MESSAGE_RECEIVED: EventSpec(
        key=CRM_MESSAGE_RECEIVED,
        label="Nova mensagem recebida",
        group=GROUP_CRM,
        placeholders=_ph("sender", "subject", "recipient", "leadName"),
        default_subject="Nova mensagem recebida de {{sender}}",
        default_body=(
            "Uma nova mensagem foi recebida no CRM.\n\n"
            "Remetente: {{sender}}\n"
            "Assunto: {{subject}}\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Nova mensagem recebida",
        in_app_message="{{sender}} respondeu à conversa \"{{subject}}\".",
        notify_admin=True,
        notify_gerente=True,
        notify_comercial=True,
        send_email=True,
        skip_actor=False,
    ),
    CRM_MESSAGE_BOUNCE: EventSpec(
        key=CRM_MESSAGE_BOUNCE,
        label="E-mail não entregue",
        group=GROUP_CRM,
        placeholders=_ph("sender", "subject", "recipient", "leadName"),
        default_subject="E-mail não entregue: {{leadName}}",
        default_body=(
            "Um e-mail enviado pelo CRM não chegou ao destinatário.\n\n"
            "Lead: {{leadName}}\n"
            "Destinatário: {{recipient}}\n"
            "Data: {{date}}\n\n"
            "Confira o endereço e tente novamente."
            f"{ACCESS_LINK}"
        ),
        in_app_title="E-mail não entregue: {{leadName}}",
        in_app_message="Falhou para {{recipient}}",
        notify_admin=True,
        notify_gerente=True,
        notify_comercial=True,
        send_email=True,
        skip_actor=False,
    ),
    CRM_MESSAGE_SENT: EventSpec(
        key=CRM_MESSAGE_SENT,
        label="Mensagem enviada pelo CRM",
        group=GROUP_CRM,
        placeholders=_ph("subject", "recipient", "leadName"),
        default_subject="Mensagem enviada para {{leadName}}",
        default_body=(
            "{{actorName}} enviou um e-mail pelo CRM.\n\n"
            "Lead: {{leadName}}\n"
            "Destinatário: {{recipient}}\n"
            "Assunto: {{subject}}\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="E-mail enviado para {{leadName}}",
        in_app_message="{{actorName}} enviou \"{{subject}}\".",
        notify_admin=True,
        notify_gerente=True,
        send_email=True,
        skip_actor=True,
    ),
    CRM_LEAD_CREATED: EventSpec(
        key=CRM_LEAD_CREATED,
        label="Novo lead no formulário / CRM",
        group=GROUP_CRM,
        placeholders=_ph("leadName", "sender", "eventName", "recipient"),
        default_subject="Novo lead: {{leadName}}",
        default_body=(
            "Um novo cadastro foi recebido no formulário / CRM.\n\n"
            "Nome: {{leadName}}\n"
            "E-mail: {{sender}}\n"
            "Tipo: {{eventName}}\n"
            "Data: {{date}}\n"
            "Quem registrou: {{actorName}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Novo lead: {{leadName}}",
        in_app_message="{{eventName}}",
        notify_admin=True,
        notify_gerente=True,
        notify_comercial=True,
        send_email=True,
        skip_actor=False,
    ),
    EVENT_CREATED: EventSpec(
        key=EVENT_CREATED,
        label="Novo evento criado",
        group=GROUP_EVENTS,
        placeholders=_ph("eventName", "city", "eventDate", "eventTime", "venue"),
        default_subject="Novo evento criado: {{eventName}}",
        default_body=(
            "{{actorName}} criou um novo evento.\n\n"
            "Evento: {{eventName}}\n"
            "Cidade: {{city}}\n"
            "Data: {{eventDate}}\n"
            "Horário: {{eventTime}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Novo evento criado",
        in_app_message="{{actorName}} criou \"{{eventName}}\".",
        notify_admin=True,
        notify_gerente=True,
        send_email=True,
        skip_actor=False,
    ),
    EVENT_UPDATED: EventSpec(
        key=EVENT_UPDATED,
        label="Evento alterado",
        group=GROUP_EVENTS,
        placeholders=_ph("eventName", "city", "eventDate", "eventTime", "venue"),
        default_subject="Evento alterado: {{eventName}}",
        default_body=(
            "{{actorName}} atualizou um evento.\n\n"
            "Evento: {{eventName}}\n"
            "Cidade: {{city}}\n"
            "Data: {{eventDate}}\n"
            "Horário: {{eventTime}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Evento alterado",
        in_app_message="{{actorName}} alterou \"{{eventName}}\".",
        notify_admin=True,
        notify_gerente=True,
        send_email=True,
        skip_actor=False,
    ),
    EVENT_DELETED: EventSpec(
        key=EVENT_DELETED,
        label="Evento excluído",
        group=GROUP_EVENTS,
        placeholders=_ph("eventName", "city", "eventDate", "eventTime", "venue"),
        default_subject="Evento excluído: {{eventName}}",
        default_body=(
            "{{actorName}} excluiu um evento.\n\n"
            "Evento: {{eventName}}\n"
            "Cidade: {{city}}\n"
            "Data: {{eventDate}}\n"
            "Horário: {{eventTime}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Evento excluído",
        in_app_message="{{actorName}} excluiu \"{{eventName}}\".",
        notify_admin=True,
        notify_gerente=True,
        send_email=True,
        skip_actor=False,
    ),
    FORM_UPDATED: EventSpec(
        key=FORM_UPDATED,
        label="Formulário alterado",
        group=GROUP_FORMS,
        placeholders=_ph("eventName"),
        default_subject="Formulário de contato atualizado",
        default_body=(
            "{{actorName}} alterou o formulário \"{{eventName}}\".\n\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Formulário alterado",
        in_app_message="{{actorName}} alterou o formulário \"{{eventName}}\".",
        notify_admin=True,
        notify_gerente=True,
        send_email=True,
        skip_actor=False,
    ),
    USER_CREATED: EventSpec(
        key=USER_CREATED,
        label="Novo usuário criado",
        group=GROUP_USERS,
        placeholders=_ph("eventName", "recipient"),
        default_subject="Novo usuário: {{eventName}}",
        default_body=(
            "{{actorName}} criou o usuário {{eventName}}.\n\n"
            "E-mail: {{recipient}}\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Novo usuário criado",
        in_app_message="{{actorName}} criou {{eventName}}.",
        notify_admin=True,
        send_email=True,
        skip_actor=False,
    ),
    USER_UPDATED: EventSpec(
        key=USER_UPDATED,
        label="Usuário alterado",
        group=GROUP_USERS,
        placeholders=_ph("eventName"),
        default_subject="Usuário alterado: {{eventName}}",
        default_body=(
            "{{actorName}} alterou o usuário {{eventName}}.\n\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Usuário alterado",
        in_app_message="{{actorName}} alterou {{eventName}}.",
        notify_admin=True,
        send_email=True,
        skip_actor=False,
    ),
    USER_DELETED: EventSpec(
        key=USER_DELETED,
        label="Usuário excluído",
        group=GROUP_USERS,
        placeholders=_ph("eventName"),
        default_subject="Usuário excluído: {{eventName}}",
        default_body=(
            "{{actorName}} excluiu o usuário {{eventName}}.\n\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Usuário excluído",
        in_app_message="{{actorName}} excluiu {{eventName}}.",
        notify_admin=True,
        send_email=True,
        skip_actor=False,
    ),
    CONFIGURATION_UPDATED: EventSpec(
        key=CONFIGURATION_UPDATED,
        label="Alteração no layout / configurações",
        group=GROUP_SYSTEM,
        placeholders=_ph("eventName"),
        default_subject="Configuração do site atualizada",
        default_body=(
            "{{actorName}} salvou uma alteração no layout da plataforma.\n\n"
            "Detalhe: {{eventName}}\n"
            "Data: {{date}}"
            f"{ACCESS_LINK}"
        ),
        in_app_title="Alteração no layout salva",
        in_app_message="{{actorName}} alterou {{eventName}}.",
        notify_admin=True,
        send_email=True,
        skip_actor=False,
    ),
}


def get_spec(event_type: str) -> EventSpec | None:
    return EVENTS.get(event_type)


def all_specs() -> list[EventSpec]:
    return list(EVENTS.values())


def catalog_payload() -> list[dict]:
    return [
        {
            "key": spec.key,
            "label": spec.label,
            "group": spec.group,
            "group_label": GROUP_LABELS.get(spec.group, spec.group),
            "placeholders": list(spec.placeholders),
            "default_subject": spec.default_subject,
            "default_body": spec.default_body,
        }
        for spec in all_specs()
    ]
