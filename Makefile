# Simple Makefile for common docker-compose tasks
.PHONY: up down build logs restart

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

restart: down up
