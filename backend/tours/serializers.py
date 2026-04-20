from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Visit, Observation, ActionItem, Attachment, Participant

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]

class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = ["id", "visit", "name", "role"]

class AttachmentSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ["id", "link_type", "visit", "observation", "action", "caption", "image_url", "uploaded_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ActionItemSerializer(serializers.ModelSerializer):
    responsible_detail = UserMiniSerializer(source="responsible", read_only=True)

    class Meta:
        model = ActionItem
        fields = [
            "id", "observation", "description", "action_type",
            "responsible", "responsible_detail",
            "due_immediate", "due_date",
            "status", "completion_notes", "completed_at",
            "created_at"
        ]


class ObservationSerializer(serializers.ModelSerializer):
    actions = ActionItemSerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Observation
        fields = ["id", "visit", "number", "text", "category", "actions", "attachments", "created_at"]


class VisitSerializer(serializers.ModelSerializer):
    observations = ObservationSerializer(many=True, read_only=True)
    participants = ParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = Visit
        fields = [
            "id", "visit_no", "manager_name", "visited_area", "area_category", "theme",
            "prep_previous_read", "prep_scope_defined", "prep_risks_considered", "prep_checked_equip",
            "prep_other", "prep_other_comments",
            "status", "visit_datetime",
            "observations", "participants",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]


class VisitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visit
        fields = [
            "id", "visit_no", "manager_name", "visited_area", "area_category", "theme",
            "prep_previous_read", "prep_scope_defined", "prep_risks_considered", "prep_checked_equip",
            "prep_other", "prep_other_comments",
            "visit_datetime"
        ]
