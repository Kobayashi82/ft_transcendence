# Base image for building the application
FROM nginx:1.25.5-alpine

# Install OpenSSL and wget
RUN apk add --no-cache openssl wget

# Download and extract the exporter
RUN wget https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v1.3.0/nginx-prometheus-exporter_1.3.0_linux_amd64.tar.gz \
    -O /tmp/nginx-prometheus-exporter.tar.gz && \
    tar -zxvf /tmp/nginx-prometheus-exporter.tar.gz -C /tmp && \
    mv /tmp/nginx-prometheus-exporter /usr/local/bin/nginx-prometheus-exporter && \
    rm /tmp/nginx-prometheus-exporter.tar.gz

RUN chmod +x /usr/local/bin/nginx-prometheus-exporter

# Create a self-signed SSL certificate
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/server.key \
    -out /etc/ssl/certs/server.crt \
    -subj "/C=ES/ST=Andalucia/L=Malaga/O=42 Malaga/OU=Formacion/CN=localhost"

# Copy configuration
COPY conf/nginx.conf /etc/nginx/nginx.conf
COPY conf/index.html /var/www/html/index.html

ARG HOST_NAME

# Replace [hostname] with the value of HOST_NAME
RUN sed -i "s|\[hostname\]|${HOST_NAME}|g" /etc/nginx/nginx.conf

# HTTP, HTTPS and Exporter
EXPOSE 80 443 9113

# Run Nginx and the exporter in the background
ENTRYPOINT ["sh", "-c", "/usr/local/bin/nginx-prometheus-exporter --nginx.scrape-uri http://localhost/metrics & nginx -g 'daemon off;'"]
