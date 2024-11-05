import os
import re
import subprocess

# Nombre del proyecto y de la app
project_name = os.getenv("SERVICE_NAME", "unnamed")

# Crear el proyecto Django en la carpeta actual
subprocess.run(["django-admin", "startproject", project_name, "."])

# Ruta al archivo settings.py en la carpeta actual
settings_path = os.path.join(os.getcwd(), project_name, "settings.py")

# Crear la app en la carpeta actual
subprocess.run(["python", "manage.py", "startapp", "core"])
# subprocess.run(["python", "manage.py", "startapp", "[app_name]"])

# Configuración personalizada que vamos a insertar
custom_settings = """
import os
import logging
import logstash

ALLOWED_HOSTS = ['*']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        },
    },
    'handlers': {
        'logstash': {
            'level': 'DEBUG',
            'class': 'logstash.TCPLogstashHandler',
            'host': 'logstash',
            'port': 5044,
            'version': 1,
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'default': {
            'handlers': ['logstash', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'logstash': {
            'handlers': ['logstash'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'console': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'transcendence',
        'USER': 'admin',
        'PASSWORD': os.getenv('ADMIN_PASS'),
        'HOST': 'postgre',
        'PORT': '5432',
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://redis:6379/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}
"""

# Leer settings.py, modificarlo y escribir los ajustes personalizados
with open(settings_path, 'r+') as settings_file:
    content = settings_file.read()
    
    # Añadir 'core' a INSTALLED_APPS
    content = re.sub(
        r"INSTALLED_APPS = \[\n([^\]]+)",
        r"INSTALLED_APPS = [\n\1    'core',\n",
        content,
    )
    
    # Reemplazar cualquier configuración existente de ALLOWED_HOSTS
    content = re.sub(
        r"ALLOWED_HOSTS = \[.*?\]\n",
        "",
        content,
        flags=re.DOTALL
    )
    
    # Reemplazar cualquier configuración existente de DATABASES
    content = re.sub(
        r"# Database.*?DATABASES\s*=\s*\{.*?\n\}",
        "",
        content,
        flags=re.DOTALL
    )
    
    # Añadir las configuraciones personalizadas al final del archivo
    content += custom_settings
    
    # Escribir el contenido modificado
    settings_file.seek(0)
    settings_file.write(content)
    settings_file.truncate()
