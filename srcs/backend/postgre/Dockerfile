# Usa la imagen oficial de ElasticSearch
FROM dpostgres:13

# Instala OpenSSL y wget
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Descarga y extrae el elasticsearch-prometheus-exporter
RUN wget https://github.com/prometheus-community/elasticsearch_exporter/releases/download/v1.8.0/elasticsearch_exporter-1.8.0.linux-amd64.tar.gz \
    -O /tmp/elasticsearch-exporter.tar.gz && \
    tar -zxvf /tmp/elasticsearch-exporter.tar.gz -C /tmp && \
    mv /tmp/elasticsearch_exporter-1.8.0.linux-amd64/elasticsearch_exporter /usr/local/bin/elasticsearch-exporter && \
    rm -rf /tmp/elasticsearch-exporter.tar.gz /tmp/elasticsearch_exporter-1.8.0.linux-amd64


RUN chmod +x /usr/local/bin/elasticsearch-exporter

# Expone el puerto 5044 (ElasticSearch) y 9114 (para el exporter)
EXPOSE 5044 9114

# Ejecuta Elasticsearch y el exportador
CMD ["sh", "-c", "/usr/local/bin/elasticsearch-exporter --es.uri=http://localhost:9200 & /usr/local/bin/docker-entrypoint.sh"]