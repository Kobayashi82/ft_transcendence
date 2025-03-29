FROM docker.elastic.co/kibana/kibana:7.17.4

# Create directory for dashboards
USER kibana
RUN mkdir -p /usr/share/kibana/dashboards

# Copy dashboards and entrypoint script
COPY conf/dashboards/*.ndjson /usr/share/kibana/dashboards/
COPY conf/entrypoint.sh /usr/share/kibana/

# Kibana
EXPOSE 5601

ENTRYPOINT ["/usr/share/kibana/entrypoint.sh"]
