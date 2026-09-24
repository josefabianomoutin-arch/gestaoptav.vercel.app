#!/usr/bin/env bash

# Script de Inicialização para Servidor Linux / Ubuntu
# Sistema de Estoque e Per Capita - Servidor Interno Fechado

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}           SISTEMA DE ESTOQUE / ALMOXARIFADO E PER CAPITA${NC}"
echo -e "${BLUE}              SERVIDOR INTERNO FECHADO (ON-PREMISE / SEM INTERNET)${NC}"
echo -e "${BLUE}===============================================================================${NC}"

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERRO CRÍTICO] Node.js não foi encontrado neste servidor!${NC}"
    echo "Instale o Node.js v18 ou v20 executando:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    exit 1
fi

echo -e "${GREEN}[1/3] Node.js detectado:${NC} $(node -v)"

# 2. Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[2/3] Instalando dependências (npm install)...${NC}"
    npm install
else
    echo -e "${GREEN}[2/3] Dependências já instaladas.${NC}"
fi

# 3. Build do frontend de produção se não existir
if [ ! -d "dist" ]; then
    echo -e "${BLUE}[3/3] Compilando frontend para produção (npm run build)...${NC}"
    npm run build
else
    echo -e "${GREEN}[3/3] Frontend pronto em ./dist${NC}"
fi

# 4. Criar diretórios de persistência
mkdir -p server-data uploads

echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}  Iniciando Servidor Node.js na porta 3000...${NC}"
echo -e "${GREEN}  Pressione CTRL+C para parar o servidor.${NC}"
echo -e "${GREEN}===============================================================================${NC}"

node server.js
