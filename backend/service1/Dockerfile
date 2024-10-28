# Dockerfile para el microservicio
FROM python:3.11

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY ./requirements.txt ./

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto del código del microservicio
COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Define el entrypoint para que ejecute ambos servidores
ENTRYPOINT ["/entrypoint.sh"]

# Expone los puertos que utilizará el microservicio
EXPOSE 8000 9000
