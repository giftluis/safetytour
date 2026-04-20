from django.contrib import admin
from .models import Visit, Observation, ActionItem, Attachment

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ("visit_no", "visited_area", "manager_name", "visit_datetime", "status", "created_by")
    search_fields = ("visit_no", "visited_area", "manager_name")

@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("visit", "number", "category")
    search_fields = ("text",)

@admin.register(ActionItem)
class ActionAdmin(admin.ModelAdmin):
    list_display = ("id", "observation", "action_type", "responsible", "status", "due_date", "due_immediate")

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "link_type", "uploaded_by", "uploaded_at")
