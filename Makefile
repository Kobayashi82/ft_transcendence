
NAME = K-Pong

GREEN	= \033[0;32m
NC		= \033[0m
CU		= \033[1A
CL		= \r
CLS		= \r%50s

# docker-compose.yml file
COMPOSE_FILE = ./srcs/docker-compose.yml

all: up

# Create containers
up:
	@docker compose -f $(COMPOSE_FILE) up -d || exit 1
	@printf "\n"

# Removes containers
down:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@printf "\n"

# Restarts containers
restart:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@docker compose -f $(COMPOSE_FILE) up -d || exit 1
	@printf "\n"

# Builds containers
build:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@docker compose -f $(COMPOSE_FILE) build || exit 1
	@printf "\n ✔ Containers\t\t$(GREEN)Built$(NC)\n\n"

# Rebuilds containers
rebuild:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@docker compose -f $(COMPOSE_FILE) build --no-cache || exit 1
	@printf "\n ✔ Containers\t\t$(GREEN)Rebuilt$(NC)\n\n"

# Removes images
clean:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@printf "$(CU)$(CLS)$(CL) ✔ Images\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GREEN)Removed$(NC)\n\n"

# Removes volumes
vclean:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@printf "\nplease wait...\n"
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@printf "$(CU)$(CLS)$(CL) ✔ Volumes\t\t$(GREEN)Removed$(NC)\n\n"

# Removes images, volumes and network
fclean:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@docker network rm pong-net > /dev/null 2>&1 || true
	@printf "$(CU)$(CLS)$(CL) ✔ Images\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GREEN)Removed$(NC)\n\n"

# Removes images, volumes, network and cache
fcclean:
	@docker compose -f $(COMPOSE_FILE) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@docker network rm pong-net > /dev/null 2>&1 || true
	@docker builder prune -f > /dev/null 2>&1 || true
	@printf "$(CU)$(CLS)$(CL) ✔ Images\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GREEN)Removed$(NC)\n"
	@printf " ✔ Cache\t\t$(GREEN)Removed$(NC)\n\n"

# Remove images (private rule)
_remove:
	@docker rmi srcs-nginx > /dev/null 2>&1 || true
	@docker rmi srcs-postgre > /dev/null 2>&1 || true
	@docker rmi srcs-elasticsearch > /dev/null 2>&1 || true
	@docker rmi srcs-logstash > /dev/null 2>&1 || true
	@docker rmi srcs-kibana > /dev/null 2>&1 || true
	@docker rmi srcs-alertmanager > /dev/null 2>&1 || true
	@docker rmi srcs-grafana > /dev/null 2>&1 || true
	@docker rmi srcs-prometheus > /dev/null 2>&1 || true
	@docker rmi srcs-service1 > /dev/null 2>&1 || true

.PHONY: all up down restart build rebuild clean vclean fclean fcclean _remove

