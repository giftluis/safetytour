from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from rest_framework import status, permissions, viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from .serializers import LoginSerializer, UserSerializer

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK
        )

class MeView(APIView):
    def get(self, request):
        u = request.user
        role = 'manager'
        bu = None
        jl = None
        reg = None
        
        if hasattr(u, 'profile'):
            role = u.profile.role
            bu = u.profile.business_unit
            jl = u.profile.job_level
            reg = u.profile.region
            
        return Response({
            "id": u.id,
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": role,
            "business_unit": bu,
            "job_level": jl,
            "region": reg,
        })

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Only safety_admin or superuser can see all users
        if user.is_superuser or (hasattr(user, 'profile') and user.profile.role == 'safety_admin'):
            return User.objects.all().order_by("username")
        
        # Others can only see themselves (or nothing, depending on your UI needs)
        return User.objects.filter(id=user.id)
