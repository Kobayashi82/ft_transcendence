#!/bin/bash

# Verifica si ya existe un proyecto y si no, lo crea					(IMPORTANTE: solo es necesario para crear el proyecto la primera vez)
if [ ! -f "manage.py" ]; then
    django-admin startproject service1 .
fi

# Inicia "daphne" en el puerto 9000										(IMPORTANTE: eliminar si no se usa "daphne")
daphne -b 0.0.0.0 -p 9000 service1.asgi:application &

# Inicia "gunicorn" en el puerto 8000									(IMPORTANTE: eliminar --reload antes de entrar en produccion)
gunicorn --reload service1.wsgi:application --bind 0.0.0.0:8000

# Espera a que "gunicorn" o "daphne" falle para terminar el contenedor	(IMPORTANTE: solo es necesario si se usa "daphne")
wait -n
