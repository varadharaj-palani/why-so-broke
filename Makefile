DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml

# Start everything in dev mode
up:
	$(DEV) up --build

# Start in background
upd:
	$(DEV) up --build -d

# Stop everything
down:
	$(DEV) down

# Generate a new migration (after model changes)
# Usage: make migration name="add_something"
migration:
	$(DEV) run --rm --entrypoint "" backend alembic revision --autogenerate -m "$(name)"

# Run migrations manually
migrate:
	$(DEV) run --rm --entrypoint "" backend alembic upgrade head

# Open a Python shell in the backend container
shell:
	$(DEV) run --rm backend python

# View backend logs
logs:
	$(DEV) logs -f backend

# Production build (uses nginx static serving)
prod:
	docker compose up --build

# Rebuild without cache
rebuild:
	$(DEV) up --build --force-recreate
