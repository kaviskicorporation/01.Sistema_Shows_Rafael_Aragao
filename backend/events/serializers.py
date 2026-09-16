from rest_framework import serializers

from core.media_urls import PublicImageField, absolute_media_url

from .models import Event, EventImage, EventTemplate


class EventImageSerializer(serializers.ModelSerializer):
    image = PublicImageField(required=False, allow_null=True)
    image_display = serializers.SerializerMethodField()

    class Meta:
        model = EventImage
        fields = ["id", "image", "image_url", "image_display", "caption", "order"]

    def get_image_display(self, obj):
        return absolute_media_url(self.context.get("request"), obj.image) or (
            obj.image_url or ""
        )


class EventSerializer(serializers.ModelSerializer):
    gallery = EventImageSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    banner = PublicImageField(required=False, allow_null=True)
    card_bg_image = PublicImageField(required=False, allow_null=True)
    banner_display = serializers.SerializerMethodField()
    card_bg_image_display = serializers.SerializerMethodField()
    session_count = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "slug",
            "date",
            "time",
            "venue",
            "city",
            "state",
            "tickets_link",
            "external_link",
            "description",
            "banner",
            "banner_url",
            "banner_display",
            "card_bg_preset",
            "card_bg_color",
            "card_bg_image",
            "card_bg_image_url",
            "card_bg_image_display",
            "status",
            "status_display",
            "internal_notes",
            "hide_override",
            "hide_days_after",
            "parent",
            "gallery",
            "session_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]

    def _abs(self, field):
        return absolute_media_url(self.context.get("request"), field)

    def get_banner_display(self, obj):
        return self._abs(obj.banner) or obj.banner_url or ""

    def get_card_bg_image_display(self, obj):
        return self._abs(obj.card_bg_image) or obj.card_bg_image_url or ""

    def get_session_count(self, obj):
        return obj.sessions.count()


class PublicEventSerializer(serializers.ModelSerializer):
    gallery = EventImageSerializer(many=True, read_only=True)
    banner_display = serializers.SerializerMethodField()
    card_bg_image_display = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "name",
            "slug",
            "date",
            "time",
            "venue",
            "city",
            "state",
            "tickets_link",
            "external_link",
            "description",
            "banner_display",
            "card_bg_preset",
            "card_bg_color",
            "card_bg_image_display",
            "gallery",
        ]

    def _abs(self, field):
        return absolute_media_url(self.context.get("request"), field)

    def get_banner_display(self, obj):
        return self._abs(obj.banner) or obj.banner_url or ""

    def get_card_bg_image_display(self, obj):
        return self._abs(obj.card_bg_image) or obj.card_bg_image_url or ""


class EventTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTemplate
        fields = ["id", "name", "data", "created_at"]
        read_only_fields = ["created_at"]
