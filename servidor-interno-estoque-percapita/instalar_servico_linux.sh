#!/usr/bin/env bash

# ==============================================================================
# Script de Instalação do Serviço no Linux (systemd)
# Instala e inicializa o sistema como serviço em segundo plano 24h por dia
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}    CONFIGURAÇÃO DE SERVIÇO SYSTEMD LINUX - SERVIDOR INTERNO FECHADO           ${NC}"
echo -e "${BLUE}===============================================================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Este script precisa ser executado como root (sudo).${NC}"
  echo "Execute: sudo ./instalar_servico_linux.sh"
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node || echo "/usr/bin/node")"

if [ ! -x "$NODE_BIN" ]; then
  echo -e "${RED}[ERRO] Binário do Node.js não encontrado em $NODE_BIN${NC}"
  echo "Instale o Node.js antes de prosseguir."
  exit 1
fi

echo -e "${GREEN}• Diretório da Aplicação:${NC} $APP_DIR"
echo -e "${GREEN}• Binário do Node.js:${NC}    $NODE_BIN"

# Criar arquivo de serviço atualizado com o caminho real
SERVICE_FILE="/etc/systemd/system/sistema-estoque.service"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Sistema de Gestao de Estoque, Almoxarifado e Per Capita (Servidor Interno Fechado)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sistema-estoque
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}• Arquivo systemd gerado em:${NC} $SERVICE_FILE"

# Recarregar daemon e habilitar na inicialização
systemctl daemon-reload
systemctl enable sistema-estoque
systemctl restart sistema-estoque

echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}  ✓ SERVIÇO LINUX INSTALADO E INICIADO COM SUCESSO!                             ${NC}"
echo -e "${GREEN}  O sistema agora roda automaticamente no boot do servidor Linux.              ${NC}"
echo -e "${GREEN}===============================================================================${NC}"
echo ""
echo "Comandos úteis para gerenciar o serviço no Linux:"
echo "  • Ver status:    sudo systemctl status sistema-estoque"
echo "  • Ver logs:      sudo journalctl -u sistema-estoque -f"
echo "  • Parar:         sudo systemctl stop sistema-estoque"
echo "  • Reiniciar:     sudo systemctl restart sistema-estoque"
echo ""
