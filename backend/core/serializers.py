from rest_framework import serializers

from .contact_form import default_contact_form_config, normalize_contact_form_config
from .models import AuditLog, Notification, SiteConfig


class SiteConfigSerializer(serializers.ModelSerializer):
    """Upload de imagens via multipart; URLs ficam para fallback/padrão."""

    hero_image_display = serializers.SerializerMethodField()
    about_image_display = serializers.SerializerMethodField()
    og_image_display = serializers.SerializerMethodField()
    contact_form_config = serializers.JSONField(required=False)
    clear_hero_image = serializers.BooleanField(write_only=True, required=False)
    clear_about_image = serializers.BooleanField(write_only=True, required=False)
    clear_og_image = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = SiteConfig
        fields = [
            "id",
            "hero_title",
            "hero_subtitle",
            "hero_image",
            "hero_image_url",
            "hero_image_display",
            "primary_color",
            "secondary_color",
            "about_title",
            "about_text",
            "about_image",
            "about_image_url",
            "about_image_display",
            "instagram",
            "youtube",
            "spotify",
            "tiktok",
            "facebook",
            "footer_text",
            "contact_email",
            "contact_phone",
            "seo_title",
            "seo_description",
            "og_image",
            "og_image_url",
            "og_image_display",
            "clear_hero_image",
            "clear_about_image",
            "clear_og_image",
            "hide_rule",
            "hide_days_after",
            "agenda_default_view",
            "contact_form_config",
            "featured_video_url",
            "demo_data_active",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "hero_image_display",
            "about_image_display",
            "og_image_display",
            "demo_data_active",
            "updated_at",
        ]

    def _abs(self, image_field) -> str:
        if not image_field:
            return ""
        request = self.context.get("request")
        url = image_field.url
        return request.build_absolute_uri(url) if request else url

    def get_hero_image_display(self, obj):
        return self._abs(obj.hero_image) or obj.hero_image_url or ""

    def get_about_image_display(self, obj):
        return self._abs(obj.about_image) or obj.about_image_url or ""

    def get_og_image_display(self, obj):
        return self._abs(obj.og_image) or obj.og_image_url or ""

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["contact_form_config"] = normalize_contact_form_config(
            instance.contact_form_config
        )
        return data

    def to_internal_value(self, data):
        mutable = data
        if hasattr(data, "copy") and not isinstance(data, dict):
            mutable = data.copy()
        cfg = mutable.get("contact_form_config") if hasattr(mutable, "get") else None
        if isinstance(cfg, str) and cfg.strip():
            import json

            try:
                parsed = json.loads(cfg)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError(
                    {"contact_form_config": "JSON inválido."}
                ) from exc
            if hasattr(mutable, "__setitem__"):
                mutable["contact_form_config"] = parsed
            else:
                mutable = dict(mutable)
                mutable["contact_form_config"] = parsed
        return super().to_internal_value(mutable)

    def validate_contact_form_config(self, value):
        if value in (None, "", {}):
            return default_contact_form_config()
        if not isinstance(value, dict):
            raise serializers.ValidationError("Deve ser um objeto JSON.")
        return normalize_contact_form_config(value)

    def update(self, instance, validated_data):
        clears = {
            "hero_image": validated_data.pop("clear_hero_image", False),
            "about_image": validated_data.pop("clear_about_image", False),
            "og_image": validated_data.pop("clear_og_image", False),
        }
        for field, should_clear in clears.items():
            if should_clear:
                current = getattr(instance, field)
                if current:
                    current.delete(save=False)
                setattr(instance, field, None)
                validated_data.pop(field, None)
        return super().update(instance, validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    action_display = serializers.CharField(
        source="get_action_display", read_only=True
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "action",
            "action_display",
            "model_name",
            "object_id",
            "object_repr",
            "changes",
            "created_at",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "link", "is_read", "created_at"]
