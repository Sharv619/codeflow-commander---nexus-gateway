# Makefile for Codeflow Commander - Nexus Gateway

.PHONY: help install build test lint clean docker-build docker-up docker-down docker-logs

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies and setup project"
	@echo "  build       - Build all packages"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linting"
	@echo "  clean       - Clean build artifacts"
	@echo "  docker-build - Build Docker images"
	@echo "  docker-up   - Start Docker services"
	@echo "  docker-down - Stop Docker services"
	@echo "  docker-logs - View Docker logs"

# Installation and setup
install:
	@echo "Installing dependencies..."
	npm install
	npm run build:all

# Build commands
build:
	@echo "Building all packages..."
	npm run build:all

# Test commands
test:
	@echo "Running tests..."
	npm run test:all

# Linting
lint:
	@echo "Running linting..."
	npm run lint
	npm run typecheck

# Clean commands
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf packages/*/dist/
	rm -rf packages/*/build/
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Docker commands
docker-build:
	@echo "Building Docker images..."
	docker compose build

docker-up:
	@echo "Starting Docker services..."
	docker compose up -d

docker-down:
	@echo "Stopping Docker services..."
	docker compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker compose logs -f

# Development commands
dev:
	@echo "Starting development environment..."
	npm run dev

# Production commands
prod:
	@echo "Starting production environment..."
	docker compose up --profile production

# Utility commands
setup: install
	@echo "Project setup complete!"

status:
	@echo "Project status:"
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"
	@echo "Docker status: $$(docker info >/dev/null 2>&1 && echo 'Running' || echo 'Not running')"
	@echo "Git status:"
	git status --porcelain

# Security and quality checks
security:
	@echo "Running security checks..."
	npm audit
	npm run lint
	npm run typecheck

# CI/CD simulation
ci:
	@echo "Running CI pipeline simulation..."
	npm run lint
	npm run typecheck
	npm run test:all
	npm run build:all