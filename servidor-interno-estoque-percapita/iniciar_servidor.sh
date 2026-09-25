#!/usr/bin/env bash

# ==============================================================================
# Script de Inicialização para Servidor Linux / Ubuntu Server
# Sistema de Estoque / Almoxarifado, Ordens de Saída e Per Capita
# Servidor Interno Fechado (On-Premise / 100% Offline)
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}           SISTEMA DE ESTOQUE / ALMOXARIFADO E PER CAPITA${NC}"
echo -e "${BLUE}              SERVIDOR INTERNO FECHADO (ON-PREMISE / SEM INTERNET)${NC}"
echo -e "${BLUE}===============================================================================${NC}"

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO CRÍTICO] Node.js não foi encontrado neste servidor!${NC}"
    echo "Para instalar o Node.js no Ubuntu/Debian, execute:"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    echo "Ou para instalar a versão 20 LTS:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}[1/3] Node.js detectado:${NC} $NODE_VERSION"

# 2. Verificar se o frontend pré-compilado (dist) está presente
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo -e "${GREEN}[2/3] Frontend de produção pré-compilado detectado em ./dist (Pronto para uso)${NC}"
else
    echo -e "${YELLOW}[2/3] Pasta ./dist não encontrada. Tentando compilar frontend...${NC}"
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Instalando dependências de build...${NC}"
        npm install || true
    fi
    npm run build || true
fi

# 3. Verificar dependências de execução (node_modules)
if [ ! -d "node_modules/express" ]; then
    echo -e "${YELLOW}[3/3] Instalando dependências do servidor backend (npm install --omit=dev)...${NC}"
    npm install --omit=dev || npm install || true
else
    echo -e "${GREEN}[3/3] Módulos do servidor pré-instalados em ./node_modules${NC}"
fi

# 4. Garantir diretórios de persistência de dados e uploads
mkdir -p server-data uploads

# Definir porta padrão caso não fornecida
export PORT="${PORT:-3000}"

echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}  Iniciando Servidor Node.js em http://0.0.0.0:${PORT}...${NC}"
echo -e "${GREEN}  Pressione CTRL+C para encerrar o servidor.${NC}"
echo -e "${GREEN}===============================================================================${NC}"

exec node server.js
