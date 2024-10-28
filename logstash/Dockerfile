# Usa la imagen oficial de LogStash
FROM docker.elastic.co/logstash/logstash:7.17.4

# Copia la configuración de LogStash
COPY logstash.conf /usr/share/logstash/pipeline/logstash.conf
COPY logstash.yml /usr/share/logstash/config/logstash.yml

# curl -X GET "http://localhost:9200/_cat/indices?v"
# echo '{"message": "Esto es un log de prueba"}' | nc localhost 5044