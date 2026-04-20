from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        attrs["user"] = user
        return attrs

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role = serializers.CharField(source='profile.role', required=False)
    business_unit = serializers.CharField(source='profile.business_unit', required=False, allow_null=True)
    job_level = serializers.CharField(source='profile.job_level', required=False, allow_null=True)
    region = serializers.CharField(source='profile.region', required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "password", "is_active", "role", "business_unit", "job_level", "region"]

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        role = profile_data.get('role', 'manager')
        bu = profile_data.get('business_unit')
        jl = profile_data.get('job_level')
        reg = profile_data.get('region')
        
        user = User.objects.create_user(**validated_data)
        
        # Profile created by signal, update all fields
        user.profile.role = role
        user.profile.business_unit = bu
        user.profile.job_level = jl
        user.profile.region = reg
        user.profile.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        profile_data = validated_data.pop('profile', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        instance.save()

        if profile_data:
            if not hasattr(instance, 'profile'):
                from .models import UserProfile
                UserProfile.objects.create(user=instance)
            
            p = instance.profile
            p.role = profile_data.get('role', p.role)
            p.business_unit = profile_data.get('business_unit', p.business_unit)
            p.job_level = profile_data.get('job_level', p.job_level)
            p.region = profile_data.get('region', p.region)
            p.save()
            
        return instance
