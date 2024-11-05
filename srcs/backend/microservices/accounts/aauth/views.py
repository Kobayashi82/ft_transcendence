from rest_framework.views import APIView
from rest_framework.response import Response

class LoginView(APIView):
    def post(self, request):
        # Lógica para autenticación de login
        return Response({"message": "User logged in"})

class LogoutView(APIView):
    def post(self, request):
        # Lógica para cerrar sesión
        return Response({"message": "User logged out"})
