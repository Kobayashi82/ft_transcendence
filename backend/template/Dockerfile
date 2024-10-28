FROM python:3.11

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo 
COPY ./requirements.txt ./

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el script de entrada al contenedor
COPY entrypoint.sh /entrypoint.sh  

# Da permisos de ejecución al script de entrada
RUN chmod +x /entrypoint.sh

# Copia todo
COPY . .

# Define el entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Expone los puertos
EXPOSE 8000 9000
