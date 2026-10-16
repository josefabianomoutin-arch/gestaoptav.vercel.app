#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "    FINALIZANDO PACOTE DO SERVIDOR INTERNO & APP DESKTOP  "
echo "=========================================================="

TARGET_DIR="servidor-interno-estoque-percapita"
mkdir -p "$TARGET_DIR/server-data" "$TARGET_DIR/uploads" "$TARGET_DIR/public"

# 1. Compilar backend standalone se necessário
echo "[1/5] Compilando servidor backend autônomo (server.js)..."
npx esbuild "$TARGET_DIR/server.standalone.ts" \
    --bundle \
    --platform=node \
    --target=node18 \
    --outfile="$TARGET_DIR/server.js"

# 2. Copiar frontend compilado (dist) excluindo arquivos zips duplicados
echo "[2/5] Copiando frontend de produção para o pacote..."
if [ -d "dist" ]; then
    rm -rf "$TARGET_DIR/dist"
    cp -r dist "$TARGET_DIR/dist"
    rm -f "$TARGET_DIR/dist"/*.zip 2>/dev/null || true
    echo "      Frontend copiado com sucesso (sem zips duplicados)."
else
    echo "      AVISO: Pasta dist não encontrada. Execute 'npm run build' primeiro."
fi

# 3. Garantir banco de dados real
echo "[3/5] Verificando banco de dados no pacote..."
if [ ! -f "$TARGET_DIR/server-data/db.json" ] || [ $(wc -c < "$TARGET_DIR/server-data/db.json") -lt 1000000 ]; then
    if [ -f "server-data/db.json" ]; then
        echo "      Copiando banco de dados de server-data/db.json..."
        cp -v "server-data/db.json" "$TARGET_DIR/server-data/db.json"
    fi
fi
DB_SIZE=$(ls -lh "$TARGET_DIR/server-data/db.json" | awk '{print $5}')
echo "      Banco de dados pronto: $DB_SIZE"

# 4. Ajustar permissões dos scripts executáveis
echo "[4/5] Ajustando permissões executáveis dos scripts..."
chmod +x "$TARGET_DIR"/*.sh 2>/dev/null || true

# 5. Gerar arquivo ZIP
echo "[5/5] Gerando arquivo ZIP comprimido..."
node create_zip.cjs

# Copiar zip também para dist se dist existir
if [ -d "dist" ] && [ -f "public/sistema_estoque_percapita_servidor_interno.zip" ]; then
    cp -v "public/sistema_estoque_percapita_servidor_interno.zip" "dist/sistema_estoque_percapita_servidor_interno.zip" 2>/dev/null || true
fi

echo "=========================================================="
echo "    PACOTE FINALIZADO COM SUCESSO!                        "
echo "=========================================================="
