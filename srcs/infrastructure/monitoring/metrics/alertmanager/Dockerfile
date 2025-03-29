FROM prom/alertmanager

# Copy configuration
COPY conf/alertmanager.yml /etc/alertmanager/alertmanager.yml

# AlertManager
EXPOSE 9093

ENTRYPOINT ["/bin/alertmanager", "--config.file=/etc/alertmanager/alertmanager.yml"]
