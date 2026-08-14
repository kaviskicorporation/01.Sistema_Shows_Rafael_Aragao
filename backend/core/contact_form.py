"""Schema e defaults do formulário público de contratação."""

from __future__ import annotations

from copy import deepcopy


def default_contact_form_config() -> dict:
    return {
        "submit_label": "Solicitar informações",
        "areas": [
            {"id": "eventos", "label": "Eventos e Entretenimento"},
            {"id": "comercio", "label": "Comércio / Varejo"},
            {"id": "industria", "label": "Indústria"},
            {"id": "tecnologia", "label": "Tecnologia"},
            {"id": "saude", "label": "Saúde"},
            {"id": "educacao", "label": "Educação"},
            {"id": "agronegocio", "label": "Agronegócio"},
            {"id": "construcao", "label": "Construção Civil"},
            {"id": "publico", "label": "Setor Público / Prefeitura"},
            {"id": "servicos", "label": "Serviços"},
            {"id": "outros", "label": "Outros"},
        ],
        "categories": [
            {"id": "corporativo", "label": "Evento corporativo"},
            {"id": "particular", "label": "Evento particular"},
            {"id": "prefeitura", "label": "Prefeitura"},
            {"id": "casa_shows", "label": "Casa de shows"},
            {"id": "teatro", "label": "Teatro"},
            {"id": "festival", "label": "Festival"},
            {"id": "comercial", "label": "Comercial"},
            {"id": "outros", "label": "Outros"},
        ],
        "fields": [
            {
                "id": "name",
                "key": "name",
                "type": "text",
                "label": "Nome / Empresa",
                "placeholder": "Seu nome ou empresa",
                "required": True,
                "enabled": True,
                "width": "full",
            },
            {
                "id": "area",
                "key": "area",
                "type": "select",
                "options": "areas",
                "label": "Área de atuação",
                "placeholder": "Selecione...",
                "required": True,
                "enabled": True,
                "width": "half",
            },
            {
                "id": "category",
                "key": "category",
                "type": "select",
                "options": "categories",
                "label": "Tipo de evento",
                "placeholder": "Selecione...",
                "required": True,
                "enabled": True,
                "width": "half",
            },
            {
                "id": "email",
                "key": "email",
                "type": "email",
                "label": "E-mail",
                "placeholder": "voce@email.com",
                "required": True,
                "enabled": True,
                "width": "half",
            },
            {
                "id": "phone",
                "key": "phone",
                "type": "tel",
                "label": "Telefone",
                "placeholder": "(00) 00000-0000",
                "required": True,
                "enabled": True,
                "width": "half",
            },
            {
                "id": "message",
                "key": "message",
                "type": "textarea",
                "label": "Mensagem (opcional)",
                "placeholder": "Conte mais sobre o seu evento...",
                "required": False,
                "enabled": True,
                "width": "full",
            },
        ],
    }


SYSTEM_FIELD_KEYS = {"name", "area", "category", "email", "phone", "message"}


def normalize_contact_form_config(raw: dict | None) -> dict:
    """Mescla o salvo com o default para nunca quebrar o formulário."""
    base = default_contact_form_config()
    if not raw or not isinstance(raw, dict):
        return base

    cfg = deepcopy(base)
    if isinstance(raw.get("submit_label"), str) and raw["submit_label"].strip():
        cfg["submit_label"] = raw["submit_label"].strip()

    for list_key in ("areas", "categories"):
        items = raw.get(list_key)
        if isinstance(items, list) and items:
            cleaned = []
            for i, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                label = str(item.get("label") or "").strip()
                if not label:
                    continue
                oid = str(item.get("id") or "").strip() or f"{list_key}_{i}"
                cleaned.append({"id": oid, "label": label})
            if cleaned:
                cfg[list_key] = cleaned

    fields = raw.get("fields")
    if isinstance(fields, list) and fields:
        cleaned_fields = []
        for i, field in enumerate(fields):
            if not isinstance(field, dict):
                continue
            key = str(field.get("key") or "").strip()
            label = str(field.get("label") or "").strip()
            ftype = str(field.get("type") or "text").strip()
            if not key or not label:
                continue
            cleaned_fields.append(
                {
                    "id": str(field.get("id") or key or f"field_{i}"),
                    "key": key,
                    "type": ftype
                    if ftype
                    in {"text", "email", "tel", "textarea", "select"}
                    else "text",
                    "label": label,
                    "placeholder": str(field.get("placeholder") or ""),
                    "required": bool(field.get("required", False)),
                    "enabled": bool(field.get("enabled", True)),
                    "width": "half"
                    if field.get("width") == "half"
                    else "full",
                    "options": field.get("options")
                    if field.get("options") in {"areas", "categories", "custom"}
                    else None,
                    "custom_options": [
                        {"id": str(o.get("id") or f"opt_{j}"), "label": str(o.get("label") or "").strip()}
                        for j, o in enumerate(field.get("custom_options") or [])
                        if isinstance(o, dict) and str(o.get("label") or "").strip()
                    ]
                    if field.get("options") == "custom"
                    else [],
                }
            )
        if cleaned_fields:
            cfg["fields"] = cleaned_fields

    return cfg
