from django.db import models
from django.contrib.auth.models import User

class Visit(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("closed", "Closed"),
    ]

    AREA_CATEGORY_CHOICES = [
        ("Network Sites", "Network Sites"),
        ("Data Centre", "Data Centre"),
        ("Transmissions", "Transmissions"),
        ("Network Other", "Network Other"),
        ("Office", "Office"),
        ("Warehouses", "Warehouses"),
        ("Retail & Trade", "Retail & Trade"),
        ("Events", "Events"),
        ("Fleet", "Fleet"),
        ("Other", "Other"),
    ]

    visit_no = models.CharField(max_length=30, unique=True)
    manager_name = models.CharField(max_length=120)
    visited_area = models.CharField(max_length=200)
    area_category = models.CharField(max_length=50, choices=AREA_CATEGORY_CHOICES, default="Other")
    theme = models.CharField(max_length=255, blank=True)

    # Preparation checklist
    prep_previous_read = models.BooleanField(default=False)
    prep_scope_defined = models.BooleanField(default=False)
    prep_risks_considered = models.BooleanField(default=False)
    prep_checked_equip = models.BooleanField(default=False)
    prep_other = models.BooleanField(default=False)
    prep_other_comments = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    visit_datetime = models.DateTimeField()

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_visits")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.visit_no} - {self.visited_area}"


class Observation(models.Model):
    CATEGORY_CHOICES = [
        ("SP", "Safe Practice"),
        ("RB", "At-risk Behavior"),
        ("RC", "At-risk Condition"),
    ]
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="observations")
    number = models.PositiveIntegerField()
    text = models.TextField()
    category = models.CharField(max_length=2, choices=CATEGORY_CHOICES)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("visit", "number")
        ordering = ["number"]

    def __str__(self):
        return f"Obs {self.number} ({self.category})"


class ActionItem(models.Model):
    ACTION_TYPE_CHOICES = [
        ("F", "Fix"),
        ("CA", "Corrective Action"),
        ("PA", "Preventive Action"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("closed", "Closed"),
    ]

    observation = models.ForeignKey(Observation, on_delete=models.CASCADE, related_name="actions")
    description = models.TextField()
    action_type = models.CharField(max_length=2, choices=ACTION_TYPE_CHOICES)

    responsible = models.ForeignKey(User, on_delete=models.PROTECT, related_name="assigned_actions")
    due_immediate = models.BooleanField(default=False)
    due_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    completion_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Action {self.id} ({self.status})"


class Attachment(models.Model):
    LINK_TYPE_CHOICES = [
        ("visit", "Visit"),
        ("observation", "Observation"),
        ("action", "Action"),
    ]

    link_type = models.CharField(max_length=20, choices=LINK_TYPE_CHOICES)
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    observation = models.ForeignKey(Observation, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)
    action = models.ForeignKey(ActionItem, on_delete=models.CASCADE, related_name="attachments", null=True, blank=True)

    image = models.ImageField(upload_to="attachments/")
    caption = models.CharField(max_length=255, blank=True)

    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        # enforce one target
        targets = [self.visit_id is not None, self.observation_id is not None, self.action_id is not None]
        if sum(targets) != 1:
            raise ValueError("Attachment must link to exactly one of: visit, observation, action.")

    def __str__(self):
        return f"Attachment {self.id} -> {self.link_type}"


class Participant(models.Model):
    visit = models.ForeignKey(Visit, on_delete=models.CASCADE, related_name="participants")
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=150, blank=True) # e.g. "Safety Officer", "Site Manager"
    
    def __str__(self):
        return self.name
