#!/bin/bash

# Check if a project already exists, and if not, create it				(IMPORTANT: only necessary to create the project the first time)
if [ ! -f "manage.py" ]; then python create.py; fi

# python manage.py startapp [app_name]
python manage.py makemigrations
python manage.py migrate

# Start "Daphne"														(IMPORTANT: remove if "Daphne" is not used)
daphne -b 0.0.0.0 -p 9000 ${SERVICE_NAME}.asgi:application &

# Start "Gunicorn"														(IMPORTANT: remove --reload before entering production)
gunicorn --reload ${SERVICE_NAME}.wsgi:application --bind 0.0.0.0:8000

# Wait for "Gunicorn" or "Daphne" to fail to stop the container			(IMPORTANT: only necessary if "Daphne" is used)
wait -n
