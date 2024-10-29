# Usa la imagen oficial de Alpine Linux
FROM alpine:latest

# Instala curl
RUN apk add --no-cache curl

# Copia el script
COPY script.sh /script.sh
# COPY objects.ndjson /objects.ndjson

# Cambia los permisos del script
RUN chmod +x /script.sh

# Ejecuta el script
CMD ["/bin/sh", "/script.sh"]
