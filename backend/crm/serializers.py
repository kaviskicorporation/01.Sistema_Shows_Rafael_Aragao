from rest_framework import serializers

from .models import (
    Card,
    CardAttachment,
    CardChecklistItem,
    CardComment,
    CardHistory,
    KanbanColumn,
    Label,
    Lead,
)


class LeadSerializer(serializers.ModelSerializer):
    area_display = serializers.CharField(read_only=True)
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )

    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "area_atuacao",
            "area_outros",
            "area_display",
            "email",
            "phone",
            "message",
            "category",
            "category_display",
            "extra_fields",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        if attrs.get("area_atuacao") == "outros" and not attrs.get("area_outros"):
            raise serializers.ValidationError(
                {"area_outros": "Informe a sua área de atuação."}
            )
        return attrs


class PublicLeadSerializer(serializers.ModelSerializer):
    # Honeypot anti-spam: precisa vir vazio.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)
    extra_fields = serializers.JSONField(required=False)

    class Meta:
        model = Lead
        fields = [
            "name",
            "area_atuacao",
            "area_outros",
            "email",
            "phone",
            "message",
            "category",
            "extra_fields",
            "website",
        ]

    def validate_website(self, value):
        if value:
            raise serializers.ValidationError("Spam detectado.")
        return value

    def validate(self, attrs):
        if attrs.get("area_atuacao") == "outros" and not attrs.get("area_outros"):
            raise serializers.ValidationError(
                {"area_outros": "Informe a sua área de atuação."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("website", None)
        return super().create(validated_data)


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ["id", "name", "color"]


class KanbanColumnSerializer(serializers.ModelSerializer):
    card_count = serializers.SerializerMethodField()

    class Meta:
        model = KanbanColumn
        fields = ["id", "title", "order", "color", "is_lost", "is_won", "card_count"]

    def get_card_count(self, obj):
        return obj.cards.count()


class CardCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = CardComment
        fields = ["id", "card", "author", "author_name", "text", "created_at"]
        read_only_fields = ["author", "created_at"]


class CardChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardChecklistItem
        fields = ["id", "card", "text", "done", "order"]


class CardAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardAttachment
        fields = ["id", "card", "file", "name", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class CardHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CardHistory
        fields = ["id", "user_name", "text", "created_at"]


class CardSerializer(serializers.ModelSerializer):
    lead = LeadSerializer(read_only=True)
    comments = CardCommentSerializer(many=True, read_only=True)
    checklist = CardChecklistItemSerializer(many=True, read_only=True)
    attachments = CardAttachmentSerializer(many=True, read_only=True)
    history = CardHistorySerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    label_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Label.objects.all(),
        source="labels", required=False,
    )
    responsible_name = serializers.CharField(
        source="responsible.username", read_only=True
    )

    class Meta:
        model = Card
        fields = [
            "id",
            "lead",
            "column",
            "order",
            "priority",
            "labels",
            "label_ids",
            "follow_up_date",
            "responsible",
            "responsible_name",
            "color",
            "loss_reason",
            "comments",
            "checklist",
            "attachments",
            "history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
