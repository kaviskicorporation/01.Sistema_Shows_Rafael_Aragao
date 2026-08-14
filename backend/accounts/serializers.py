from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import DELEGATABLE_MODULES, ROLE_PERMISSIONS

User = get_user_model()


def sanitize_module_permissions(raw, role: str) -> dict:
    """Non-admins get explicit flags for every delegatable module."""
    if role == User.Role.ADMIN:
        return {}
    raw = raw or {}
    return {m: bool(raw.get(m, False)) for m in DELEGATABLE_MODULES}


def actor_is_admin(actor) -> bool:
    return bool(
        actor
        and actor.is_authenticated
        and (actor.is_superuser or actor.role == User.Role.ADMIN)
    )


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    module_permissions = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "is_active",
            "permissions",
            "module_permissions",
        ]

    def get_permissions(self, obj):
        return obj.effective_permissions()


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    module_permissions = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "is_active",
            "password",
            "module_permissions",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        actor = getattr(request, "user", None) if request else None
        role = attrs.get("role") or getattr(self.instance, "role", User.Role.COMERCIAL)

        if not actor_is_admin(actor):
            if role == User.Role.ADMIN:
                raise serializers.ValidationError(
                    {
                        "role": "Somente um administrador pode criar ou promover outro admin."
                    }
                )
            if self.instance and self.instance.role == User.Role.ADMIN:
                raise serializers.ValidationError(
                    "Você não pode editar contas de administrador."
                )

        if "module_permissions" in attrs:
            attrs["module_permissions"] = sanitize_module_permissions(
                attrs.get("module_permissions"), role
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None) or get_random_string(12)
        role = validated_data.get("role", User.Role.COMERCIAL)
        perms = validated_data.pop("module_permissions", None)
        if perms is None:
            base = ROLE_PERMISSIONS.get(role, {})
            perms = sanitize_module_permissions(base, role)
        else:
            perms = sanitize_module_permissions(perms, role)
        user = User(**validated_data, module_permissions=perms)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role = validated_data.get("role", instance.role)
        if "module_permissions" in validated_data:
            validated_data["module_permissions"] = sanitize_module_permissions(
                validated_data.get("module_permissions"), role
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate_username(self, value: str) -> str:
        return (value or "").strip()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
