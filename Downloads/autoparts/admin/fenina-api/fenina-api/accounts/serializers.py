from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import StaffUser


class StaffUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = StaffUser
        fields = ["id", "username", "email", "first_name", "last_name",
                  "full_name", "role", "role_label", "phone"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class EmailTokenObtainSerializer(TokenObtainPairSerializer):
    """Adds staff profile info into the login response alongside the tokens."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["name"] = user.get_full_name() or user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = StaffUserSerializer(self.user).data
        return data
