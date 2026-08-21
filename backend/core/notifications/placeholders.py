"""Substituição segura de {{variavel}} — sem eval, só allowlist do evento."""

from __future__ import annotations

import re

from .events import EventSpec

_TOKEN = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}")


def actor_label(user) -> str:
    if not user:
        return "Sistema"
    name = " ".join(
        part for part in (getattr(user, "first_name", ""), getattr(user, "last_name", "")) if part
    ).strip()
    return name or getattr(user, "username", "") or "Sistema"


def render(template: str, spec: EventSpec, values: dict[str, str]) -> str:
    allowed = set(spec.placeholders)
    data = {k: str(v) if v is not None else "" for k, v in (values or {}).items()}

    def repl(match: re.Match) -> str:
        key = match.group(1)
        if key not in allowed:
            return match.group(0)
        return data.get(key, "")

    return _TOKEN.sub(repl, template or "")
