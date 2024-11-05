FROM python:3.11


WORKDIR /app

# Install netcat
# RUN apt-get update && apt-get install -y netcat-openbsd

# Clean up
# RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copia los archivos necesarios
COPY ./requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Execute the entrypoint
ENTRYPOINT ["/entrypoint.sh"]


# Gunicorn & Daphne
EXPOSE 8000 9000
