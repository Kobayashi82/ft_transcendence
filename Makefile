
# Variables
GR = \033[0;32m
NC = \033[0m
CU = \033[1A
CL = \r%50s\r
DC = COMPOSE_BAKE=true docker compose -f srcs/docker-compose.yml


# ============================== CONTAINER RULES ==============================

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
	@printf "\n ✔ Containers\t  $(GR)Built$(NC)\n\n"

# Rebuilds containers
rebuild:
	@$(DC) down || exit 1
	@$(DC) build --no-cache || exit 1
	@printf "\n ✔ Containers\t\t$(GR)Rebuilt$(NC)\n\n"

# Show docker-compose.yml with variables expanded
config:
	@d$(DC) config

re:
	make fclean up


# ============================== CLEAN RULES ==============================

# Removes images
iclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove_images
	@printf "$(CU)$(CL) ✔ Images\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GR)Removed$(NC)\n\n"

# Removes volumes
vclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove_volumes
	@printf "$(CU)$(CL) ✔ Volumes\t\t$(GR)Removed$(NC)\n\n"

# Removes volumes
nclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove_networks
	@printf "$(CU)$(CL) ✔ Networks\t\t$(GR)Removed$(NC)\n\n"

# Removes images, volumes and network
clean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove_images
	@$(MAKE) -s _remove_volumes
	@$(MAKE) -s _remove_networks
	@printf "$(CU)$(CL) ✔ Images\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GR)Removed$(NC)\n\n"

# Removes images, volumes, network and cache
fclean:
	@$(DC) down || exit 1
	@printf "\nplease wait...\n"
	@$(MAKE) -s _remove_images
	@$(MAKE) -s _remove_volumes
	@$(MAKE) -s _remove_networks
	@docker builder prune -f > /dev/null 2>&1 || true
	@printf "$(CU)$(CL) ✔ Images\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Volumes\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Network\t\t$(GR)Removed$(NC)\n"
	@printf " ✔ Cache\t\t$(GR)Removed$(NC)\n\n"


# ============================== PRIVATE RULES ==============================

# Remove networks (private rule)
_remove_networks:
	@docker network rm frontend-net > /dev/null 2>&1 || true
	@docker network rm backend-net > /dev/null 2>&1 || true
	@docker network rm service-net > /dev/null 2>&1 || true

# Remove volumes (private rule)
_remove_volumes:
	@docker volume rm srcs_nginx_data > /dev/null 2>&1 || true
	@docker volume rm srcs_web_data > /dev/null 2>&1 || true
	@docker volume rm srcs_ms_stats_data > /dev/null 2>&1 || true

# Remove images (private rule)
_remove_images:
	@docker rmi srcs-nginx > /dev/null 2>&1 || true
	@docker rmi srcs-web > /dev/null 2>&1 || true
	@docker rmi srcs-gateway > /dev/null 2>&1 || true
	@docker rmi srcs-stats > /dev/null 2>&1 || true
	@docker rmi srcs-game > /dev/null 2>&1 || true
	@docker rmi srcs-ai_deeppong > /dev/null 2>&1 || true

.PHONY: all up down restart build rebuild iclean vclean nclean clean fclean _remove_images _remove_volumes _remove_networks
