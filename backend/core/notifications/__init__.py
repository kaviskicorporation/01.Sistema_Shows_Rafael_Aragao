"""Canal B: avisos da plataforma (in-app + e-mail). Separado da mailbox CRM."""

from .service import emit, emit_safe

__all__ = ["emit", "emit_safe"]
