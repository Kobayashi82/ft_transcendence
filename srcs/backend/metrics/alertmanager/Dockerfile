# Usa la imagen oficial de AlertManager
FROM prom/alertmanager

# Copia la configuración de Prometheus
COPY alertmanager.yml /etc/alertmanager/alertmanager.yml

# Establece el punto de entrada
ENTRYPOINT ["/bin/alertmanager", "--config.file=/etc/alertmanager/alertmanager.yml"]

# Expone el puerto 9093
EXPOSE 9093
