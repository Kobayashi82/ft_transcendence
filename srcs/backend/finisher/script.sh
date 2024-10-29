#!/bin/sh

# Espera a que Kibana esté listo
echo -e "Waiting for Kibana...\n"
until curl -s -o /dev/null -u "elastic:${ELASTIC_PASSWORD}" "http://kibana:5601"; do
	sleep 5
done

# Espera a que Elasticsearch esté listo
echo -e "Waiting for ElasticSearch...\n"
until curl -s -o /dev/null -u "elastic:${ELASTIC_PASSWORD}" "http://elasticsearch:9200"; do
	sleep 5
done

# Crear usuario con roles kibana_user y kibana_admin
curl -s -X POST "http://elasticsearch:9200/_security/user/${ELASTICUSER_NAME}" -u "elastic:${ELASTIC_PASSWORD}" -H "Content-Type: application/json" -d '{
  "password": "'${ELASTICUSER_PASSWORD}'",
  "roles": ["monitoring_user", "editor"],
  "full_name": "'${ELASTICUSER_FULLNAME}'",
  "email": "'${ELASTICUSER_EMAIL}'"
}'

# Importa los objetos
# curl -s -X POST "http://kibana:5601/api/saved_objects/_import?createNewCopies=true" \
# -H "kbn-xsrf: true" \
# -u "elastic:${ELASTIC_PASSWORD}" \
# -F "file=@/objects.ndjson"

# curl -s -X POST "http://kibana:5601/_plugin/kibana/api/saved_objects/_import" \
# -H "kbn-xsrf: true" \
# -u "elastic:${ELASTIC_PASSWORD}" \
# --form "file=@objects.ndjson"

# echo -e "\nDashboard imported\n"
