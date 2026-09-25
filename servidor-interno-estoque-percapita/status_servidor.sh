#!/usr/bin/env bash

# ==============================================================================
# Script de Verificação de Status do Servidor Linux
# ==============================================================================

PORT="${PORT:-3000}"

echo "================================================================="
echo "  DIAGNÓSTICO DO SERVIDOR LINUX (PORTA $PORT)"
echo "================================================================="

if command -v systemctl &> /dev/null && systemctl is-active --quiet sistema-estoque; then
  echo "• Serviço systemd: ATIVO (Rodando em segundo plano)"
else
  echo "• Serviço systemd: NÃO ATIVO (Pode estar rodando em primeiro plano)"
fi

echo ""
echo "Testando resposta da API local:"
if command -v curl &> /dev/null; then
  curl -s "http://127.0.0.1:$PORT/api/status" || echo "[AVISO] Servidor não respondeu na porta $PORT"
else
  echo "[AVISO] curl não encontrado para testar a porta."
fi
echo ""
echo "Processos Node em execução:"
ps aux | grep "[s]erver.js" || echo "Nenhum processo server.js detectado."
echo "================================================================="
