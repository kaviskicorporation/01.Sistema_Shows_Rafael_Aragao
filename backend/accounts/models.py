from django.contrib.auth.models import AbstractUser
from django.db import models


# Módulos que o admin (ou quem tiver "users") pode marcar por usuário
DELEGATABLE_MODULES = [
    "events",
    "crm",
    "leads",
    "config",
    "dashboard",
    "users",
    "audit",
    "notifications",
]


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrador"
        GERENTE = "gerente", "Gerente"
        COMERCIAL = "comercial", "Comercial"
        VISUALIZADOR = "visualizador", "Visualizador"

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.COMERCIAL
    )
    phone = models.CharField(max_length=30, blank=True)
    # Permissões explícitas por módulo (aba Equipe).
    # Vazio {} = usa o template do role. Admin ignora este campo.
    module_permissions = models.JSONField(default=dict, blank=True)

    MODULES = list(DELEGATABLE_MODULES)

    def has_module(self, module: str) -> bool:
        if self.is_superuser or self.role == self.Role.ADMIN:
            return True
        custom = self.module_permissions or {}
        if custom:
            return bool(custom.get(module, False))
        return ROLE_PERMISSIONS.get(self.role, {}).get(module, False)

    def can_write(self, module: str) -> bool:
        if self.is_superuser or self.role == self.Role.ADMIN:
            return True
        if self.role == self.Role.VISUALIZADOR:
            return False
        return self.has_module(module)

    def effective_permissions(self) -> dict:
        return {m: self.has_module(m) for m in self.MODULES}


ROLE_PERMISSIONS = {
    User.Role.ADMIN: {m: True for m in User.MODULES},
    User.Role.GERENTE: {
        "events": True,
        "crm": True,
        "leads": True,
        "users": False,
        "audit": False,
        "config": True,
        "dashboard": True,
        "notifications": False,
    },
    User.Role.COMERCIAL: {
        "events": True,
        "crm": True,
        "leads": True,
        "users": False,
        "audit": False,
        "config": False,
        "dashboard": True,
        "notifications": False,
    },
    User.Role.VISUALIZADOR: {
        "events": True,
        "crm": True,
        "leads": True,
        "users": False,
        "audit": False,
        "config": False,
        "dashboard": True,
        "notifications": False,
    },
}
