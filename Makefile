
all:
	docker compose -f docker-compose.yml up --build -d
	@echo "Application is running at http://localhost:3000"

build:
	docker compose -f docker-compose.yml build

up:
	docker compose -f docker-compose.yml up -d

status:
	docker compose -f docker-compose.yml ps

stop:
	docker compose -f docker-compose.yml down

.PHONY: all