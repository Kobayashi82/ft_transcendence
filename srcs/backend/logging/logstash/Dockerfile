# Usa la imagen oficial de LogStash
FROM docker.elastic.co/logstash/logstash:7.17.4

# Copia la configuración de LogStash
COPY logstash.conf /usr/share/logstash/pipeline/logstash.conf

# Expone el puerto 5044
EXPOSE 5044
