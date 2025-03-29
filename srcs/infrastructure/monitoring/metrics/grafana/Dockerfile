FROM grafana/grafana

# Create directory for dashboards
RUN mkdir -p /etc/grafana/provisioning/datasources /etc/grafana/provisioning/dashboards

# Copy configuration and dashboards
COPY conf/prometheus.yml /etc/grafana/provisioning/datasources/
COPY conf/dashboards/dashboard.yml /etc/grafana/provisioning/dashboards/
COPY conf/dashboards/*.json /etc/grafana/provisioning/dashboards/

# Grafana
EXPOSE 3000
