from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('manager', 'Manager'),
        ('safety_admin', 'Safety Admin'),
    ]
    
    BU_CHOICES = [
        ('Technology', 'Technology'),
        ('Finance', 'Finance'),
        ('Legal', 'Legal'),
        ('EBU', 'EBU'),
        ('CBU', 'CBU'),
        ('COPS', 'COPS'),
        ('MPESA', 'MPESA'),
        ('HR', 'HR'),
        ('Corporate Affairs', 'Corporate Affairs'),
        ('MD', 'MD'),
    ]
    
    LEVEL_CHOICES = [
        ('Director', 'Director'),
        ('Senior Manager', 'Senior Manager'),
        ('Manager', 'Manager'),
    ]
    
    REGION_CHOICES = [
        ('South', 'South'),
        ('Centre', 'Centre'),
        ('North', 'North'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='manager')
    business_unit = models.CharField(max_length=50, choices=BU_CHOICES, blank=True, null=True)
    job_level = models.CharField(max_length=50, choices=LEVEL_CHOICES, blank=True, null=True)
    region = models.CharField(max_length=20, choices=REGION_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # This ensures usage of save() on user saves profile too if needed
    if hasattr(instance, 'profile'):
        instance.profile.save()
