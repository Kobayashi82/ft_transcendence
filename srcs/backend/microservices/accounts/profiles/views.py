# from django.db import IntegrityError
# from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from core.models import UserTest  # Asegúrate de importar tu modelo UserTest
import logging

logger = logging.getLogger('default')

# Almacenamiento en memoria para fines de demostración (puedes eliminarlo si lo deseas)
user_profiles = {}

class ProfileView(APIView):
    def get(self, request):
        # Para la demostración, obtendremos el perfil del usuario "johndoe"
        username = "johndoe"  # Cambia esto según tus necesidades

        # Intenta obtener el perfil del usuario desde la caché
        user_profile = cache.get(f'user_profile_{username}')

        if user_profile is None:
            # Si no está en caché, obtenerlo de la base de datos
            try:
                user_instance = UserTest.objects.get(username=username)  # Obtiene el usuario de la base de datos
                user_profile = {
                    "username": user_instance.username,
                    "email": user_instance.email,
                    "first_name": user_instance.first_name,
                    "last_name": user_instance.last_name
                }
                
                # Almacena el perfil en caché por 5 minutos (300 segundos)
                cache.set(f'user_profile_{username}', user_profile, timeout=300)
                
                logger.info("User profile retrieved from database: %s", user_profile)

            except UserTest.DoesNotExist:
                logger.error("User with username %s does not exist.", username)
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                logger.error("Error retrieving user profile: %s", str(e))
                return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            logger.info("User profile retrieved from cache: %s", user_profile)

        return Response(user_profile, status=status.HTTP_200_OK)

class EditProfileView(APIView):
    def put(self, request):
        username = request.data.get('username', 'johndoe')  # Cambia esto según tus necesidades
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        # Verificar que se proporcionen todos los datos necesarios
        if not all([username, email, first_name, last_name]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Actualizar el perfil en la base de datos
            user_instance, created = UserTest.objects.update_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name
                }
            )

            # Actualizar el perfil en la caché de Redis
            user_profile = {
                "username": user_instance.username,
                "email": user_instance.email,
                "first_name": user_instance.first_name,
                "last_name": user_instance.last_name
            }
            cache.set(f'user_profile_{username}', user_profile, timeout=300)  # Actualizar caché

            # Registrar un mensaje de información
            logger.info("User profile updated and cached: %s", user_profile)

            return Response({"message": "Profile updated successfully", "data": user_profile}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Error updating user profile: %s", str(e))
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CreateUserView(APIView):
    def post(self, request):
        # Obtener los datos del perfil del usuario desde la solicitud
        username = request.data.get('username')
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        password = request.data.get('password')  # Asegúrate de manejar la contraseña de manera segura

        # Validar que se proporcionen todos los datos necesarios
        if not all([username, email, first_name, last_name, password]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Crear un nuevo usuario en la base de datos
            user = UserTest.objects.create(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password  # Recuerda encriptar la contraseña antes de guardar
            )

            # Crear el perfil del usuario
            user_profile = {
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name
            }

            # Almacenar el perfil en la caché de Redis
            cache.set(f'user_profile_{user.username}', user_profile, timeout=300)  # Cachear el nuevo perfil
            
            # Registrar el evento de creación del usuario
            logger.info("New user created and cached: %s", user_profile)

            return Response({"message": "User created successfully", "data": user_profile}, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error("Error creating user: %s", str(e))
            return Response({"error": "Internal server error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
