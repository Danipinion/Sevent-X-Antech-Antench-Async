# ==============================================================================
# TANDUR Project Makefile
# ==============================================================================

-include .env
export

POSTGRES_PORT ?= 5432
POSTGRES_USER ?= tandur
POSTGRES_PASSWORD ?= change_me
POSTGRES_DB ?= tandur

DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable
MIGRATIONS_DIR = database/migrations
MIGRATE ?= $(shell which migrate 2>/dev/null || echo $(HOME)/go/bin/migrate)

.PHONY: help setup up up-build build stop down restart logs ps frontend backend test lint migrate-up migrate-down clean db-up db-down db-version db-force db-seed db-reset

# Warna terminal
BLUE   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

help: ## Menampilkan daftar command Makefile yang tersedia
	@echo "$(GREEN)=============================================================$(RESET)"
	@echo "$(GREEN)           TANDUR - Command Line Developer Tool$(RESET)"
	@echo "$(GREEN)=============================================================$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)%-18s$(RESET) %s\n", $$1, $$2}'

setup: ## Menyiapkan kebutuhan awal proyek (copy .env dan install dependencies)
	@echo "$(YELLOW)Menyiapkan file environment lokal...$(RESET)"
	@if [ ! -f .env ]; then cp .env.example .env && echo "$(GREEN).env berhasil disalin dari .env.example$(RESET)"; else echo "$(BLUE).env sudah ada, melewati penyalinan.$(RESET)"; fi
	@echo "$(YELLOW)Menginstal dependencies frontend...$(RESET)"
	@cd apps/web && npm install
	@echo "$(YELLOW)Mengunduh dependencies backend...$(RESET)"
	@if command -v go >/dev/null 2>&1; then cd apps/api && go mod tidy; else echo "$(BLUE)Golang tidak terdeteksi di mesin lokal. Backend akan berjalan otomatis di dalam Docker container.$(RESET)"; fi
	@echo "$(GREEN)Setup proyek TANDUR selesai! Gunakan 'make up' untuk menjalankan service.$(RESET)"

up: ## Menjalankan seluruh service development menggunakan Docker Compose
	@echo "$(YELLOW)Menjalankan seluruh service development TANDUR...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Seluruh service berhasil berjalan!$(RESET)"
	@echo "$(BLUE)Web Frontend: http://localhost:5173$(RESET)"
	@echo "$(BLUE)Backend API:  http://localhost:8080/health$(RESET)"

backend-up: ## Menjalankan backend dan database saja di Docker (tanpa container web)
	@echo "$(YELLOW)Menjalankan backend API & database di Docker...$(RESET)"
	docker compose up -d postgres redis garage api
	@echo "$(GREEN)Backend API siap digunakan di http://localhost:8080 !$(RESET)"

up-build: ## Menjalankan service dengan membangun ulang image
	@echo "$(YELLOW)Membangun ulang image dan menjalankan service...$(RESET)"
	docker compose up -d --build

build: ## Membangun seluruh image Docker service
	@echo "$(YELLOW)Membangun image docker service...$(RESET)"
	docker compose build

stop: ## Menghentikan service sementara tanpa menghapus container
	@echo "$(YELLOW)Menghentikan sementara service container...$(RESET)"
	docker compose stop

down: ## Menghentikan seluruh service development
	@echo "$(YELLOW)Menghentikan service development TANDUR...$(RESET)"
	docker compose down

restart: ## Memulai ulang service development
	@echo "$(YELLOW)Memulai ulang service development...$(RESET)"
	docker compose restart

logs: ## Melihat log real-time seluruh service development
	docker compose logs -f

ps: ## Melihat status running container
	docker compose ps

frontend: ## Menjalankan server web frontend lokal (Vite)
	@echo "$(YELLOW)Menjalankan frontend dev server...$(RESET)"
	cd apps/web && npm run dev

backend: ## Menjalankan server backend API lokal (Go)
	@echo "$(YELLOW)Menjalankan backend dev server...$(RESET)"
	cd apps/api && go run ./cmd/api

test: ## Menjalankan seluruh unit test (backend & frontend)
	@echo "$(YELLOW)Menjalankan pengujian backend...$(RESET)"
	cd apps/api && go test -v ./...
	@echo "$(YELLOW)Menjalankan pengujian frontend...$(RESET)"
	cd apps/web && npm run lint

lint: ## Menjalankan linting dan pengecekan tipe kode
	@echo "$(YELLOW)Memeriksa tipe TypeScript frontend...$(RESET)"
	cd apps/web && npm run lint
	@echo "$(YELLOW)Memeriksa kompilasi backend Go...$(RESET)"
	cd apps/api && go vet ./...
	@echo "$(GREEN)Seluruh pemeriksaan lint berhasil!$(RESET)"

# ------------------------------------------------------------------------------
# Database Migration & Seed Commands (golang-migrate)
# ------------------------------------------------------------------------------

db-up: ## Menjalankan seluruh migration database ke versi terbaru
	@echo "$(YELLOW)Menjalankan migrasi database up ke $(DATABASE_URL)...$(RESET)"
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" up
	@echo "$(GREEN)Migrasi database berhasil diselesaikan.$(RESET)"

db-down: ## Melakukan rollback 1 versi migration terakhir
	@echo "$(YELLOW)Melakukan rollback 1 versi migrasi database...$(RESET)"
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" down 1
	@echo "$(YELLOW)Rollback selesai.$(RESET)"

db-version: ## Menampilkan versi migrasi database saat ini
	@$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" version

db-force: ## Memperbaiki status dirty migration (make db-force VERSION=...)
	@if [ -z "$(VERSION)" ]; then echo "$(RED)Error: Gunakan 'make db-force VERSION=nomor_versi'$(RESET)"; exit 1; fi
	$(MIGRATE) -path $(MIGRATIONS_DIR) -database "$(DATABASE_URL)" force $(VERSION)

db-seed: ## Memasukkan data awal (seeds) ke database
	@echo "$(YELLOW)Memasukkan data seed ke database...$(RESET)"
	docker compose exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) < database/seeds/001_roles.sql
	docker compose exec -T postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) < database/seeds/002_commodities.sql
	@echo "$(GREEN)Seed data berhasil dimasukkan.$(RESET)"

db-reset: ## Menghapus volume database dan mengulang dari fresh database
	@echo "$(RED)PERINGATAN: Semua data database development akan dihapus.$(RESET)"
	docker compose down -v
	docker compose up -d postgres

migrate-up: db-up ## Alias untuk db-up
migrate-down: db-down ## Alias untuk db-down

clean: ## Membersihkan cache, dist, dan artefak temporary yang aman dihapus
	@echo "$(YELLOW)Membersihkan build cache dan temporary files...$(RESET)"
	rm -rf apps/web/dist apps/web/.vite
	@echo "$(GREEN)Pembersihan artefak development selesai.$(RESET)"
