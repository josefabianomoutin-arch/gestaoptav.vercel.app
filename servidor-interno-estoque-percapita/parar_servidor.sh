#!/usr/bin/env bash

# ==============================================================================
# Script para Parar o Servidor Linux
# ==============================================================================

echo "Parando o serviço sistema-estoque..."

if command -v systemctl &> /dev/null && systemctl is-active --quiet sistema-estoque; then
  sudo systemctl stop sistema-estoque
  echo "✓ Serviço systemd finalizado com sucesso."
else
  pkill -f "node server.js" || true
  echo "✓ Processos node server.js finalizados."
fi
