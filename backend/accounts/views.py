from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.audit import log_action
from core.models import AuditLog

from .permissions import ModulePermission
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserSerializer,
    UserWriteSerializer,
)

User = get_user_model()


def set_auth_cookies(response, access, refresh):
    common = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": "/",
    }
    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        str(access),
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        **common,
    )
    if refresh is not None:
        response.set_cookie(
            settings.AUTH_COOKIE_REFRESH,
            str(refresh),
            max_age=int(
                settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
            ),
            **common,
        )
    return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            return Response(
                {"detail": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data)
        set_auth_cookies(response, refresh.access_token, refresh)
        AuditLog.objects.create(
            user=user,
            action=AuditLog.Action.LOGIN,
            model_name="User",
            object_id=str(user.pk),
            object_repr=user.username,
        )
        return response


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        response = Response({"detail": "Sessão encerrada."})
        response.delete_cookie(
            settings.AUTH_COOKIE_ACCESS, path="/"
        )
        response.delete_cookie(
            settings.AUTH_COOKIE_REFRESH, path="/"
        )
        return response


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw:
            return Response(
                {"detail": "Sem token de atualização."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshToken(raw)
            access = refresh.access_token
        except TokenError:
            return Response(
                {"detail": "Token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        new_refresh = None
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
            user = User.objects.get(pk=refresh["user_id"])
            new_refresh = RefreshToken.for_user(user)
            access = new_refresh.access_token
        response = Response({"detail": "ok"})
        set_auth_cookies(response, access, new_refresh)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"detail": "Senha atual incorreta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Senha alterada com sucesso."})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    permission_classes = [ModulePermission]
    module = "users"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_superuser or user.role == User.Role.ADMIN:
            return qs
        # Quem tem módulo "users" gerencia a equipe, mas não contas admin
        return qs.exclude(role=User.Role.ADMIN)

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return UserSerializer
        return UserWriteSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if (
            instance.role == User.Role.ADMIN
            and not (request.user.is_superuser or request.user.role == User.Role.ADMIN)
        ):
            return Response(
                {"detail": "Você não pode excluir um administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.CREATE, instance)
        from core.notifications import emit_safe
        from core.notifications.events import USER_CREATED

        emit_safe(
            USER_CREATED,
            actor=self.request.user,
            payload={
                "eventName": instance.get_full_name() or instance.username,
                "recipient": instance.email or "",
            },
            dedupe_key=f"user:{instance.pk}:created",
            link="/admin/usuarios",
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.Action.UPDATE, instance)
        from django.utils import timezone
        from core.notifications import emit_safe
        from core.notifications.events import USER_UPDATED

        emit_safe(
            USER_UPDATED,
            actor=self.request.user,
            payload={"eventName": instance.get_full_name() or instance.username},
            dedupe_key=f"user:{instance.pk}:updated:{timezone.now().timestamp()}",
            link="/admin/usuarios",
        )

    def perform_destroy(self, instance):
        label = instance.get_full_name() or instance.username
        pk = instance.pk
        log_action(self.request.user, AuditLog.Action.DELETE, instance)
        instance.delete()
        from core.notifications import emit_safe
        from core.notifications.events import USER_DELETED

        emit_safe(
            USER_DELETED,
            actor=self.request.user,
            payload={"eventName": label},
            dedupe_key=f"user:{pk}:deleted",
            link="/admin/usuarios",
        )
