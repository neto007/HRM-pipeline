.PHONY: install frontend backend dev kill-backend kill-frontend kill-all clean help

# Cores para output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Mostra esta mensagem de ajuda
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║         HRM FORGE - Development Commands                  ║$(NC)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## Instala todas as dependências (Python + Node.js)
	@echo "$(CYAN)🔧 Instalando dependências Python...$(NC)"
	uv sync
	@echo "$(CYAN)📦 Instalando dependências Node.js...$(NC)"
	cd frontend && npm install
	@echo "$(GREEN)✅ Instalação completa!$(NC)"

frontend: ## Inicia apenas o frontend (Vite dev server)
	@echo "$(CYAN)🎨 Iniciando Frontend HRM Forge...$(NC)"
	@echo "$(YELLOW)👉 Acesse: http://localhost:5173$(NC)"
	cd frontend && npm run dev

backend: ## Inicia apenas o backend (FastAPI)
	@echo "$(CYAN)⚙️  Iniciando Backend API...$(NC)"
	@echo "$(YELLOW)👉 Rodando em: http://127.0.0.1:9007$(NC)"
	.venv/bin/python -u l2j_pipeline/api.py

dev: ## Inicia frontend e backend simultaneamente
	@echo "$(CYAN)🚀 Iniciando HRM Forge completo...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:5173$(NC)"
	@echo "$(YELLOW)Backend:  http://127.0.0.1:9007$(NC)"
	@echo ""
	@make -j2 frontend backend

restart: ## Reinicia o backend (mata e inicia novamente)
	@echo "$(CYAN)🔄 Reiniciando backend...$(NC)"
	@make kill-backend
	@sleep 1
	@make backend

restart-all: ## Reinicia frontend e backend
	@echo "$(CYAN)🔄 Reiniciando HRM Forge completo...$(NC)"
	@make kill-all
	@sleep 1
	@make dev

kill-backend: ## Para o processo do backend (porta 9007)
	@echo "$(CYAN)🛑 Parando backend...$(NC)"
	@-fuser -k 9007/tcp 2>/dev/null || echo "$(YELLOW)⚠️  Backend não estava rodando$(NC)"

kill-frontend: ## Para o processo do frontend (porta 5173)
	@echo "$(CYAN)🛑 Parando frontend...$(NC)"
	@-fuser -k 5173/tcp 2>/dev/null || echo "$(YELLOW)⚠️  Frontend não estava rodando$(NC)"

kill-all: kill-backend kill-frontend ## Para todos os processos (frontend + backend)
	@echo "$(GREEN)✅ Todos os processos foram parados$(NC)"

clean: ## Remove arquivos temporários e caches
	@echo "$(CYAN)🧹 Limpando arquivos temporários...$(NC)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -prune -o -type f -name "*.pyc" -exec rm -f {} + 2>/dev/null || true
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

status: ## Verifica o status dos serviços
	@echo "$(CYAN)📊 Status dos Serviços HRM Forge$(NC)"
	@echo ""
	@echo "$(YELLOW)Backend (porta 9007):$(NC)"
	@-lsof -i :9007 2>/dev/null || echo "  ❌ Não está rodando"
	@echo ""
	@echo "$(YELLOW)Frontend (porta 5173):$(NC)"
	@-lsof -i :5173 2>/dev/null || echo "  ❌ Não está rodando"

logs-backend: ## Mostra os logs do backend
	@tail -f api.log

test-backend: ## Testa se o backend está respondendo
	@echo "$(CYAN)🧪 Testando backend...$(NC)"
	@curl -s http://127.0.0.1:9007/status | python3 -m json.tool || echo "$(YELLOW)⚠️  Backend não está respondendo$(NC)"

index-l2j: ## Cria índice RLCoder do repositório L2J
	@echo "$(CYAN)📚 Indexando repositório L2J para RLCoder...$(NC)"
	.venv/bin/python l2j_pipeline/index_l2j_repo.py

transcribe-test: ## Testa transcrição com RLCoder integrado
	@echo "$(CYAN)🔄 Testando transcrição com RLCoder...$(NC)"
	.venv/bin/python l2j_pipeline/transcribe.py --mock --lang Go
