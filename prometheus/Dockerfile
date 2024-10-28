# Usa la imagen oficial de Prometheus
FROM prom/prometheus:latest

# Copia la configuración de Prometheus
COPY prometheus.yml /etc/prometheus/prometheus.yml

# Establece el punto de entrada con la configuración de la URL externa
ENTRYPOINT ["/bin/prometheus", "--config.file=/etc/prometheus/prometheus.yml", "--web.listen-address=:9090", "--web.external-url=https://localhost/prometheus/"]

