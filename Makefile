# Project name
NAME = K-Pong

# Path to the docker-compose.yml file
COMPOSE_FILE = ./srcs/docker-compose.yml

all: up

# Starts the containers in detached mode
up:
	@docker compose -f $(COMPOSE_FILE) up -d || exit 1
	@echo "Containers are up and running."

# Stops and removes the containers
down:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@echo "Containers have been stopped and removed."

# Builds the containers
build:
	@docker compose -f $(COMPOSE_FILE) build || exit 1
	@echo "Containers have been built."

# Cleans up unused containers and networks
clean:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@docker system prune -f > /dev/null 2>&1
	@echo "Unused containers and networks have been removed."

# Cleans everything, including volumes
fclean: clean
	@docker volume rm pgdata 2> /dev/null || true
	@docker system prune -a --volumes -f > /dev/null 2>&1
	@echo "All resources have been cleaned."

# Rebuilds and restarts the containers
restart: down up
	@echo "Containers have been restarted."

.PHONY: all up down build clean fclean restart

