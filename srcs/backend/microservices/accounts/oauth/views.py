from rest_framework.views import APIView
from rest_framework.response import Response

class OAuthLoginView(APIView):
    def get(self, request):
        # Lógica para redirigir al usuario al proveedor OAuth
        return Response({"message": "Redirect to OAuth provider"})

class OAuthCallbackView(APIView):
    def get(self, request):
        # Lógica para manejar el callback de OAuth
        return Response({"message": "OAuth callback processed"})
