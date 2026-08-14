from .models import AuditLog


def log_action(user, action, instance, changes=None):
    """Create an AuditLog entry for a model instance."""
    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        model_name=instance.__class__.__name__,
        object_id=str(getattr(instance, "pk", "")),
        object_repr=str(instance)[:200],
        changes=changes or {},
    )
