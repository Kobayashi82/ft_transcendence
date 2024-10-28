#!/bin/bash

# Inicia Gunicorn en el puerto 8000 para manejar peticiones HTTP REST
gunicorn --reload service1.wsgi:application --bind 0.0.0.0:8000 &		# Eliminar --reload antes de entrar en produccion

# Inicia Daphne en el puerto 9000 para manejar WebSockets
daphne -b 0.0.0.0 -p 9000 service1.asgi:application

# Espera a que cualquiera de los dos falle para terminar el contenedor
wait -n
