# Usa la imagen oficial de Grafana
FROM grafana/grafana

# Crea los directorios necesarios
RUN mkdir -p /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards

# Copia los archivos
COPY prometheus.yml /etc/grafana/provisioning/datasources/
COPY dashboards/dashboard.yml /etc/grafana/provisioning/dashboards/
COPY dashboards/nginx.json /etc/grafana/provisioning/dashboards/

# Expone el puerto 3000
EXPOSE 3000
