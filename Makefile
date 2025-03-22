
# Variables
GR = \033[0;32m
NC = \033[0m
CU = \033[1A
CL = \r%50s\r
DC = COMPOSE_BAKE=true UID=$(shell id -u) docker compose -f srcs/docker-compose.yml

all: up

# Create containers
up:
	@$(DC) up -d || exit 1
	@printf "\n"

# Removes containers
down:
	@$(DC) down || exit 1
	@printf "\n"

# Restarts containers
restart:
	@$(DC) down || exit 1
	@$(DC) up -d || exit 1
	@printf "\n"

# Builds containers
build:
	@$(DC) down || exit 1
	@$(DC) build || exit 1
	@printf "\n ✔ Containers\t$(GR)Built$(NC)\n\n"

# Rebuilds containers
rebuild:
	@$(DC) down || exit 1
	@$(DC) build --no-cache || exit 1
	@printf "\n ✔ Containers\t\t$(GR)Rebuilt$(NC)\n\n"

# Removes images
clean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@printf "$(CU)$(CL) ✔ Images\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t\t$(GR)Removed$(NC)\n\n"

# Removes volumes
vclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@printf "$(CU)$(CL) ✔ Volumes\t\t\t$(GR)Removed$(NC)\n\n"

# Removes images, volumes and network
fclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@docker network rm pong-net > /dev/null 2>&1 || true
	@printf "$(CU)$(CL) ✔ Images\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t\t$(GR)Removed$(NC)\n\n"

# Removes images, volumes, network and cache
fcclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove
	@docker volume rm srcs_db-data > /dev/null 2>&1 || true
	@docker volume rm srcs_db_logs > /dev/null 2>&1 || true
	@docker network rm pong-net > /dev/null 2>&1 || true
	@docker builder prune -f > /dev/null 2>&1 || true
	@printf "$(CU)$(CL) ✔ Images\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Cache\t\t\t$(GR)Removed$(NC)\n\n"

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

# Show docker-compose.yml with variables expanded
config:
	@d$(DC) config

.PHONY: all up down restart build rebuild clean vclean fclean fcclean _remove

