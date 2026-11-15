# ==============================================================================
# TANDUR Project Makefile
# ==============================================================================

.PHONY: help setup up down restart logs ps frontend backend test lint migrate-up migrate-down clean

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
	@cd apps/api && go mod tidy
	@echo "$(GREEN)Setup proyek TANDUR selesai! Gunakan 'make up' untuk menjalankan service.$(RESET)"

up: ## Menjalankan seluruh service development menggunakan Docker Compose
	@echo "$(YELLOW)Menjalankan seluruh service development TANDUR...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Seluruh service berhasil berjalan!$(RESET)"
	@echo "$(BLUE)Web Frontend: http://localhost$(RESET)"
	@echo "$(BLUE)Traefik Dash: http://localhost:8081$(RESET)"

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
	cd apps/api && go run ./cmd/api/main.go

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

migrate-up: ## Menjalankan migration skema ke database PostgreSQL development
	@echo "$(YELLOW)Mengeksekusi migration up ke database development...$(RESET)"
	docker compose exec -T postgres psql -U tandur -d tandur -f /docker-entrypoint-initdb.d/01_schema.sql || true
	@echo "$(GREEN)Migration selesai dijalankan.$(RESET)"

migrate-down: ## Melakukan rollback migration skema database development (destructive)
	@echo "$(RED)PERINGATAN: Operasi ini akan menghapus tabel pada database development!$(RESET)"
	docker compose exec -T postgres psql -U tandur -d tandur -f /docker-entrypoint-initdb.d/000001_init_schema.down.sql || true
	@echo "$(YELLOW)Rollback migration selesai.$(RESET)"

clean: ## Membersihkan cache, dist, dan artefak temporary yang aman dihapus
	@echo "$(YELLOW)Membersihkan build cache dan temporary files...$(RESET)"
	rm -rf apps/web/dist apps/web/.vite
	@echo "$(GREEN)Pembersihan artefak development selesai.$(RESET)"
