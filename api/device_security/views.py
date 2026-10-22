from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import DeviceCredential
from .services import begin, finish


class DeviceThrottle(UserRateThrottle):
    scope = "device_security"
    rate = "30/min"


class PasswordThrottle(UserRateThrottle):
    scope = "device_password"
    rate = "5/min"


class DeviceSecurityView(APIView):
    def get_throttles(self):
        return [
            PasswordThrottle() if self.kwargs["action"] == "password-unlock" else DeviceThrottle()
        ]

    def post(self, request, action):
        if not isinstance(request.data, dict):
            raise ValidationError("Requisição inválida.")
        if action == "password-unlock":
            password = request.data.get("password")
            if not isinstance(password, str) or not request.user.check_password(password):
                raise ValidationError("Senha incorreta.")
            if request.data.get("disable") is True:
                DeviceCredential.objects.filter(
                    user=request.user, credential_id=request.data.get("credential_id")
                ).delete()
                return Response({"unlocked": True, "enabled": False})
            return Response({"unlocked": True})
        if action not in {
            "register-options",
            "register-verify",
            "unlock-options",
            "unlock-verify",
            "disable-options",
            "disable-verify",
        }:
            return Response(status=404)
        purpose, phase = action.split("-")
        if phase == "options":
            result = begin(
                user=request.user,
                token=request.auth,
                purpose=purpose,
                origin=request.data.get("origin"),
                credential_id=request.data.get("credential_id"),
            )
        else:
            result = finish(
                user=request.user,
                token=request.auth,
                purpose=purpose,
                challenge_id=request.data.get("challenge_id"),
                response=request.data.get("response"),
            )
        return Response(result)
