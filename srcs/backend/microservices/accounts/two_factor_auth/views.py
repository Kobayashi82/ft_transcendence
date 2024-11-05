from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class Enable2FAView(APIView):
    def post(self, request):
        # Lógica para habilitar la autenticación en dos pasos
        # Generar y enviar un código de 2FA al usuario, por ejemplo.
        return Response({"message": "2FA enabled and code sent to user"}, status=status.HTTP_200_OK)

class Verify2FAView(APIView):
    def post(self, request):
        # Lógica para verificar el código de 2FA proporcionado por el usuario
        code = request.data.get("code")
        # Aquí iría la lógica para verificar el código
        if code == "expected_code":  # Esto es un ejemplo, en la práctica sería una verificación real
            return Response({"message": "2FA verified successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"message": "Invalid 2FA code"}, status=status.HTTP_400_BAD_REQUEST)
