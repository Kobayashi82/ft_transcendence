#!/bin/bash

# Verifica si ya existe un proyecto y si no, lo crea
if [ ! -f "manage.py" ]; then
    django-admin startproject [microservice] .
fi

# Inicia "daphne" en el puerto 9000 (eliminar si no se usa "daphne")
daphne -b 0.0.0.0 -p 9000 [microservice].asgi:application &

# Inicia "gunicorn" en el puerto 8000
gunicorn --reload [microservice].wsgi:application --bind 0.0.0.0:8000		# Eliminar --reload antes de entrar en produccion

# Espera a que "gunicorn" o "daphne" falle para terminar el contenedor
wait -n																		# Solo es necesario si se usar "daphne"
