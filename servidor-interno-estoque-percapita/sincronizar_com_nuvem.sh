#!/usr/bin/env bash

# ==============================================================================
# Script para Sincronizar / Baixar Dados Mais Recentes da Nuvem
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}    SINCRONIZAÇÃO DE DADOS GERAIS DO SISTEMA COM A BASE NA NUVEM               ${NC}"
echo -e "${BLUE}===============================================================================${NC}"

DB_FILE="$SCRIPT_DIR/server-data/db.json"
BACKUP_FILE="$SCRIPT_DIR/server-data/db_backup_$(date +%Y%m%d_%H%M%S).json"

mkdir -p "$SCRIPT_DIR/server-data"

if [ -f "$DB_FILE" ]; then
  echo -e "${YELLOW}Criando backup de segurança do banco local em: $BACKUP_FILE${NC}"
  cp "$DB_FILE" "$BACKUP_FILE"
fi

echo -e "${BLUE}Baixando dados mais recentes da base de dados geral...${NC}"
curl -fsSL "https://gestao-ppais-default-rtdb.firebaseio.com/.json" -o "$DB_FILE"

if [ -s "$DB_FILE" ]; then
  SIZE_MB=$(du -m "$DB_FILE" | cut -f1)
  echo -e "${GREEN}✓ Banco de dados geral sincronizado com sucesso! (${SIZE_MB} MB)${NC}"
  echo -e "${GREEN}Reiniciando servidor para aplicar as alterações...${NC}"
  if command -v systemctl &> /dev/null && systemctl is-active --quiet sistema-estoque; then
    sudo systemctl restart sistema-estoque
    echo -e "${GREEN}✓ Serviço do sistema reiniciado.${NC}"
  fi
else
  echo -e "${RED}[ERRO] Falha ao baixar banco de dados da nuvem. O arquivo de backup foi mantido.${NC}"
fi
