from rest_framework import serializers

from .models import Event, EventImage, EventTemplate


class EventImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImage
        fields = ["id", "image", "image_url", "caption", "order"]


class EventSerializer(serializers.ModelSerializer):
    gallery = EventImageSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    banner_display = serializers.SerializerMethodField()
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

    def get_banner_display(self, obj):
        request = self.context.get("request")
        if obj.banner:
            url = obj.banner.url
            return request.build_absolute_uri(url) if request else url
        return obj.banner_url or ""

    def get_session_count(self, obj):
        return obj.sessions.count()


class PublicEventSerializer(serializers.ModelSerializer):
    gallery = EventImageSerializer(many=True, read_only=True)
    banner_display = serializers.SerializerMethodField()

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
            "gallery",
        ]

    def get_banner_display(self, obj):
        request = self.context.get("request")
        if obj.banner:
            url = obj.banner.url
            return request.build_absolute_uri(url) if request else url
        return obj.banner_url or ""


class EventTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTemplate
        fields = ["id", "name", "data", "created_at"]
        read_only_fields = ["created_at"]
