import logging
from django.http import JsonResponse

logger = logging.getLogger('default')

def home(request):
    logger.debug("Esto es un mensaje de debug")
    logger.info("Esto es un mensaje de informacion")
    logger.warning("Esto es un mensaje de advertencia")
    logger.error("Esto es un mensaje de error")
    logger.critical("Esto es un mensaje critico")
    return JsonResponse({'message': 'Hello from Django!'})
