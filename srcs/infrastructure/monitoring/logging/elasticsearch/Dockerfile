FROM docker.elastic.co/elasticsearch/elasticsearch:7.17.4

# Install wget, curl and exporter
RUN apt-get update && apt-get install -y wget curl
RUN wget https://github.com/prometheus-community/elasticsearch_exporter/releases/download/v1.8.0/elasticsearch_exporter-1.8.0.linux-amd64.tar.gz \
-O /tmp/elasticsearch-exporter.tar.gz && \
tar -zxvf /tmp/elasticsearch-exporter.tar.gz -C /tmp && \
mv /tmp/elasticsearch_exporter-1.8.0.linux-amd64/elasticsearch_exporter /usr/local/bin/elasticsearch-exporter && \
rm -rf /tmp/elasticsearch-exporter.tar.gz /tmp/elasticsearch_exporter-1.8.0.linux-amd64
RUN chmod +x /usr/local/bin/elasticsearch-exporter

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy entrypoint script
COPY conf/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# ElasticSearch & Exporter
EXPOSE 9200 9114

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
