FROM prom/prometheus:latest

# Copy configuration and rules
COPY conf/prometheus.yml /etc/prometheus/prometheus.yml
COPY conf/rules/*.yaml /etc/prometheus/

# Prometheus
EXPOSE 9090

ENTRYPOINT ["/bin/prometheus", "--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--storage.tsdb.retention.time=30d", "--web.listen-address=:9090", "--web.external-url=https://localhost/prometheus/"]
