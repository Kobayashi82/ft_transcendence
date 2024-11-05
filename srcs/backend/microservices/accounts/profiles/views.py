from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ProfileView(APIView):
    def get(self, request):
        # Lógica para obtener el perfil del usuario
        # En este ejemplo, vamos a devolver un perfil ficticio
        user_profile = {
            "username": "johndoe",
            "email": "johndoe@example.com",
            "first_name": "John",
            "last_name": "Doe"
        }
        return Response(user_profile, status=status.HTTP_200_OK)

class EditProfileView(APIView):
    def put(self, request):
        # Lógica para actualizar el perfil del usuario
        # En este ejemplo, vamos a simular la actualización del perfil
        updated_data = request.data
        # Aquí iría la lógica para actualizar el perfil en la base de datos
        return Response({"message": "Profile updated successfully", "data": updated_data}, status=status.HTTP_200_OK)
