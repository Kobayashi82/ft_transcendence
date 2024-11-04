# Debian image
FROM debian:bullseye

# Install PHP & wget
RUN apt-get update && apt-get install -y wget php7.4 php7.4-pgsql php7.4-pdo php7.4-pdo-pgsql

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Download Adminer
RUN mkdir -p adminer
RUN wget "https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php" -O adminer/index.php
RUN wget "https://raw.githubusercontent.com/Niyko/Hydra-Dark-Theme-for-Adminer/master/adminer.css" -O adminer/adminer.css

# Execute PHP as a server
ENTRYPOINT ["php7.4", "-S", "0.0.0.0:8000"]

EXPOSE 8000
