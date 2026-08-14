from rest_framework.permissions import BasePermission, SAFE_METHODS


class ModulePermission(BasePermission):
    """Generic per-module permission.

    Set `module` on the view (e.g. module = "events"). Read access requires
    `user.has_module(module)`; write access requires `user.can_write(module)`.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        module = getattr(view, "module", None)
        if module is None:
            return True
        if request.method in SAFE_METHODS:
            return user.has_module(module)
        return user.can_write(module)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.role == user.Role.ADMIN)
        )
