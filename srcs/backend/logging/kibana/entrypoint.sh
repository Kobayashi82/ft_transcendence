#!/bin/bash
set -e

# Function to check if Kibana is ready
wait_for_kibana() {
  echo "Waiting for Kibana to start..."
  until curl -s http://localhost:5601/api/status > /dev/null; do
    sleep 5
  done
  sleep 10
  echo "Kibana is up and running!"
}

# Start Kibana in the background and wait
/usr/local/bin/kibana-docker &
KIBANA_PID=$!
wait_for_kibana

# Check if dashboards directory exists and contains files
if [ -d "/usr/share/kibana/dashboards" ] && [ "$(ls -A /usr/share/kibana/dashboards)" ]; then
  echo "Found dashboard files to check"
  
  # Function to check if a specific dashboard exists in Elasticsearch
  dashboard_exists() {
    local dashboard_id="$1"
    local response
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -XGET "http://localhost:5601/api/saved_objects/dashboard/$dashboard_id" \
      -H "kbn-xsrf: true" \
      -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD})
    
    if [ "$response" == "200" ]; then
      return 0  # Dashboard exists
    else
      return 1  # Dashboard doesn't exist
    fi
  }
  
  # For each dashboard file
  for dashboard_file in /usr/share/kibana/dashboards/*.ndjson; do
    if [ -f "$dashboard_file" ]; then
      echo "Processing file: $dashboard_file"
      
      # Extract dashboard IDs from the file (this es un enfoque simplificado)
      dashboard_ids=$(grep -o '"id":"[^"]*","type":"dashboard"' "$dashboard_file" | sed 's/"id":"//;s/","type":"dashboard"//')
      
      # If no dashboard IDs found, assume it needs to be imported
      needs_import=true
      
      # If we found dashboard IDs, check if any of them already exist
      if [ ! -z "$dashboard_ids" ]; then
        for id in $dashboard_ids; do
          if dashboard_exists "$id"; then
            echo "Dashboard $id already exists in Elasticsearch"
            needs_import=false
            break
          else
            echo "Dashboard $id doesn't exist yet"
            needs_import=true
          fi
        done
      fi
      
      # If we need to import
      if $needs_import; then
        echo "Importing dashboard: $dashboard_file"
        curl -X POST "http://localhost:5601/api/saved_objects/_import" \
          -H "kbn-xsrf: true" \
          --form file=@${dashboard_file} \
          -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
          --form overwrite=true
        
        # Check import status
        if [ $? -eq 0 ]; then
          echo "Successfully imported: $dashboard_file"
        else
          echo "Failed to import: $dashboard_file"
        fi
      else
        echo "Skipping import for $dashboard_file as dashboards already exist"
      fi
    fi
  done
  
  echo "Dashboard processing completed"
else
  echo "No dashboards to import: directory doesn't exist or is empty"
fi

# Monitor processes
echo "Kibana is now running!"
wait $KIBANA_PID