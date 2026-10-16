#!/usr/bin/env bash

# ==============================================================================
# Iniciar Sistema de Estoque e Per Capita - MODO APLICATIVO NATIVO (LINUX)
# Abre o sistema em janela dedicada SEM barra de navegação/endereço de internet!
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}     SISTEMA DE ESTOQUE E PER CAPITA - MODO APLICATIVO DESKTOP (LINUX)${NC}"
echo -e "${BLUE}===============================================================================${NC}"

# 1. Verificar se o servidor já está ativo na porta 3000
SERVER_URL="http://localhost:3000"
IS_RUNNING=false

if command -v curl &> /dev/null; then
    if curl -s -f "$SERVER_URL/api/health" &> /dev/null || curl -s -f "$SERVER_URL" &> /dev/null; then
        IS_RUNNING=true
    fi
fi

if [ "$IS_RUNNING" = false ]; then
    echo -e "${YELLOW}[1/3] Servidor Node.js não está em execução. Iniciando em segundo plano...${NC}"
    mkdir -p server-data uploads
    nohup node server.js > "$SCRIPT_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$SCRIPT_DIR/server.pid"
    echo -e "${GREEN}      Servidor iniciado (PID: $SERVER_PID). Aguardando carregamento...${NC}"
    
    # Aguardar até 10 segundos para o servidor responder
    for i in {1..20}; do
        sleep 0.5
        if curl -s -f "$SERVER_URL/api/health" &> /dev/null || curl -s -f "$SERVER_URL" &> /dev/null; then
            IS_RUNNING=true
            break
        fi
    done
else
    echo -e "${GREEN}[1/3] Servidor Node.js já está ativo na porta 3000.${NC}"
fi

# 2. Localizar navegador com suporte a modo aplicativo (--app)
echo -e "${BLUE}[2/3] Localizando navegador para execução em modo Aplicativo de Desktop...${NC}"

APP_DIR="$HOME/.config/sistema-estoque-desktop"
mkdir -p "$APP_DIR"

LAUNCHED=false

# Lista de navegadores baseados em Chromium (suportam modo --app 100% nativo sem barra de URL)
BROWSERS=("google-chrome" "chromium-browser" "chromium" "microsoft-edge" "brave-browser" "google-chrome-stable")

for BROWSER in "${BROWSERS[@]}"; do
    if command -v "$BROWSER" &> /dev/null; then
        echo -e "${GREEN}[3/3] Abrindo janela de aplicativo via $BROWSER (sem barra de internet)...${NC}"
        "$BROWSER" \
            --app="$SERVER_URL" \
            --user-data-dir="$APP_DIR" \
            --class="SistemaEstoque" \
            --name="Sistema de Estoque e Per Capita" \
            --window-size=1440,900 \
            --start-maximized \
            --no-first-run \
            --no-default-browser-check \
            "$@" > /dev/null 2>&1 &
        LAUNCHED=true
        break
    fi
done

# Fallback para Firefox se nenhum Chromium for encontrado
if [ "$LAUNCHED" = false ]; then
    if command -v firefox &> /dev/null; then
        echo -e "${YELLOW}[3/3] Chromium não encontrado. Abrindo janela no Firefox...${NC}"
        firefox --new-window "$SERVER_URL" > /dev/null 2>&1 &
        LAUNCHED=true
    elif command -v xdg-open &> /dev/null; then
        echo -e "${YELLOW}[3/3] Abrindo navegador padrão via xdg-open...${NC}"
        xdg-open "$SERVER_URL" > /dev/null 2>&1 &
        LAUNCHED=true
    else
        echo -e "${RED}[ERRO] Nenhum navegador detectado! Acesse manualmente: $SERVER_URL${NC}"
    fi
fi

if [ "$LAUNCHED" = true ]; then
    echo -e "${GREEN}===============================================================================${NC}"
    echo -e "${GREEN}  Aplicativo iniciado com sucesso!${NC}"
    echo -e "${GREEN}  Para encerrar o servidor de fundo, execute: ./parar_servidor.sh${NC}"
    echo -e "${GREEN}===============================================================================${NC}"
fi
