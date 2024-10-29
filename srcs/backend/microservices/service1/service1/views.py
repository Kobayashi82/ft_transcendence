import logging

from django.http import JsonResponse

# Configurar el logger
logger = logging.getLogger(__name__)

def home(request):
	logger.info("Acceso a la vista home")
	return JsonResponse({'message': 'Hello from Django!'})
