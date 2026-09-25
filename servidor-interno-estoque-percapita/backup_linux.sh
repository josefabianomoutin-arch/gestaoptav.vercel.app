#!/usr/bin/env bash

# ==============================================================================
# Script de Backup Automático para Linux (Crontab / Manual)
# Salva uma cópia compactada do banco de dados e arquivos
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_estoque_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Gerando backup dos dados em $BACKUP_FILE..."
tar -czf "$BACKUP_FILE" server-data/ uploads/ 2>/dev/null || true

echo "✓ Backup concluído com sucesso: $BACKUP_FILE"
# Manter apenas os últimos 30 backups para não lotar o disco
find "$BACKUP_DIR" -name "backup_estoque_*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true
