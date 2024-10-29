# Usa la imagen oficial de Nginx
FROM nginx:latest

# Instala OpenSSL
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Crea un certificado SSL autosignado
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/server.key \
    -out /etc/ssl/certs/server.crt \
    -subj "/C=ES/ST=Malaga/L=Malaga/O=42 Escuela/OU=Formacion/CN=localhost"

# Copia el archivo de configuración personalizado
COPY nginx.conf /etc/nginx/nginx.conf
COPY microservices /etc/nginx/microservices

# Establece el comando por defecto para iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

# Expone el puerto 80 (HTTP) y el puerto 443 (HTTPS)
EXPOSE 80 443
