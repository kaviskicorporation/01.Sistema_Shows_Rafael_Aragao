from rest_framework import serializers

from .contact_form import default_contact_form_config, normalize_contact_form_config
from .models import (
    AuditLog,
    Notification,
    NotificationPreference,
    NotificationRecipient,
    SiteConfig,
    Sponsor,
    FaqItem,
)


class SponsorSerializer(serializers.ModelSerializer):
    image_display = serializers.SerializerMethodField()
    clear_image = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = Sponsor
        fields = [
            "id",
            "name",
            "text_mark",
            "image",
            "image_url",
            "image_display",
            "link",
            "order",
            "is_active",
            "clear_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "image_display", "created_at", "updated_at"]

    def get_image_display(self, obj):
        if obj.image:
            request = self.context.get("request")
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return obj.image_url or ""

    def update(self, instance, validated_data):
        if validated_data.pop("clear_image", False):
            if instance.image:
                instance.image.delete(save=False)
            instance.image = None
        return super().update(instance, validated_data)


class FaqItemSerializer(serializers.ModelSerializer):
    answer_html = serializers.SerializerMethodField()

    class Meta:
        model = FaqItem
        fields = [
            "id",
            "question",
            "answer",
            "answer_html",
            "icon",
            "order",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "answer_html", "created_at", "updated_at"]

    def get_answer_html(self, obj):
        from core.html_sanitize import prepare_faq_answer

        return prepare_faq_answer(obj.answer or "")

    def validate_question(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Informe a pergunta.")
        return text

    def validate_answer(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Informe a resposta.")
        return text


class SiteConfigSerializer(serializers.ModelSerializer):
    """Upload de imagens via multipart; URLs ficam para fallback/padrão."""

    hero_image_display = serializers.SerializerMethodField()
    about_image_display = serializers.SerializerMethodField()
    og_image_display = serializers.SerializerMethodField()
    contact_bg_image_display = serializers.SerializerMethodField()
    sponsors = serializers.SerializerMethodField()
    contact_form_config = serializers.JSONField(required=False)
    clear_hero_image = serializers.BooleanField(write_only=True, required=False)
    clear_about_image = serializers.BooleanField(write_only=True, required=False)
    clear_og_image = serializers.BooleanField(write_only=True, required=False)
    clear_contact_bg_image = serializers.BooleanField(
        write_only=True, required=False
    )

    class Meta:
        model = SiteConfig
        fields = [
            "id",
            "hero_title",
            "hero_subtitle_lead",
            "hero_subtitle",
            "hero_image",
            "hero_image_url",
            "hero_image_display",
            "hero_wordmark",
            "hero_badge",
            "hero_cta_primary",
            "hero_cta_secondary",
            "hero_cta_icon_primary",
            "hero_cta_icon_secondary",
            "hero_next_label",
            "hero_scroll_label",
            "nav_cta",
            "nav_icon_cta",
            "nav_label_agenda",
            "nav_icon_agenda",
            "nav_label_sobre",
            "nav_icon_sobre",
            "nav_label_video",
            "nav_icon_video",
            "nav_label_contato",
            "nav_icon_contato",
            "hero_tag_1",
            "hero_tag_2",
            "hero_tag_3",
            "hero_tag_4",
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
            "clear_contact_bg_image",
            "hide_rule",
            "hide_days_after",
            "agenda_default_view",
            "agenda_list_page_size",
            "contact_form_config",
            "contact_eyebrow",
            "contact_title_line1",
            "contact_title_line2",
            "contact_scroll_hint",
            "contact_bg_image",
            "contact_bg_image_url",
            "contact_bg_image_display",
            "featured_video_url",
            "sponsors_title",
            "faq_eyebrow",
            "faq_title",
            "sponsors",
            "demo_data_active",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "hero_image_display",
            "about_image_display",
            "og_image_display",
            "contact_bg_image_display",
            "sponsors",
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

    def get_contact_bg_image_display(self, obj):
        return (
            self._abs(obj.contact_bg_image)
            or obj.contact_bg_image_url
            or "/images/rei-dos-peao.png"
        )

    def get_sponsors(self, obj):
        qs = Sponsor.objects.filter(is_active=True).order_by("order", "id")
        return SponsorSerializer(qs, many=True, context=self.context).data

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
            "contact_bg_image": validated_data.pop(
                "clear_contact_bg_image", False
            ),
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
        fields = [
            "id",
            "title",
            "message",
            "link",
            "is_read",
            "event_type",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "title",
            "message",
            "link",
            "event_type",
            "created_at",
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "event_type",
            "notify_admin",
            "notify_gerente",
            "notify_comercial",
            "notify_visualizador",
            "send_email",
            "email_recipient_ids",
        ]


class NotificationRecipientSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationRecipient
        fields = ["id", "email", "is_primary", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Informe um e-mail.")
        qs = NotificationRecipient.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Este e-mail já está cadastrado.")
        return email

