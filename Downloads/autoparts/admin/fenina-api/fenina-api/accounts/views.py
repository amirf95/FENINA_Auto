from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics, permissions
from .serializers import EmailTokenObtainSerializer, StaffUserSerializer


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = StaffUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
