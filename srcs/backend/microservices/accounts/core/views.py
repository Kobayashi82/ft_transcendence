from django.shortcuts import render
from django.core.cache import cache
from django.http import JsonResponse
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from .models import User
import logging

logger = logging.getLogger('default')

    # logger.debug("Esto es un mensaje de debug")
    # logger.info("Esto es un mensaje de informacion")
    # logger.warning("Esto es un mensaje de advertencia")
    # logger.error("Esto es un mensaje de error")
    # logger.critical("Esto es un mensaje critico")

    # cache.set('test_key', 'working!', timeout=30)
    # cache_value = cache.get('test_key')

def home(request):
	# # Crear un registro en la base de datos
	# test_obj = TestModel.objects.create(name="Test Entry")

	# # Almacenar el valor en Redis usando una clave específica
	# cache_key = f"testmodel:{test_obj.id}"
	# cache.set(cache_key, test_obj.name, timeout=15)  # Guardar en Redis por 15 minutos

	# # Recuperar el valor de Redis primero
	# cached_value = cache.get(cache_key)

	# if cached_value:
	# 	logger.info(f"Redis cache entry: {cached_value}")
	# else:
	# 	# Si el valor no está en Redis, recuperarlo de la base de datos
	# 	db_value = TestModel.objects.get(id=test_obj.id)
	# 	logger.info(f"Database entry: {db_value.name}")

	return JsonResponse({'message': 'Hello from Django!'})
