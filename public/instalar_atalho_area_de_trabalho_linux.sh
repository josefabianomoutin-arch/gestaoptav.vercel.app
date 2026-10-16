#!/usr/bin/env bash

# ==============================================================================
# Instalar Atalho na Área de Trabalho e Menu de Aplicativos (Linux)
# Sistema de Estoque / Almoxarifado e Per Capita
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Garantir permissões de execução nos scripts
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

ICON_PATH="$SCRIPT_DIR/public/icone-taiuva.png"
if [ ! -f "$ICON_PATH" ]; then
    ICON_PATH="$SCRIPT_DIR/public/icone-taiuva.jpg"
fi
if [ ! -f "$ICON_PATH" ]; then
    ICON_PATH="$SCRIPT_DIR/dist/icone-taiuva.png"
fi
if [ ! -f "$ICON_PATH" ]; then
    ICON_PATH="$SCRIPT_DIR/public/fachada-penitenciaria-taiuva.jpg"
fi

DESKTOP_CONTENT="[Desktop Entry]
Version=1.0
Type=Application
Name=Penitenciária de Taiúva - Gestão e Estoque
GenericName=Gestão de Almoxarifado e Estoque
Comment=Sistema Oficial de Gestão da Penitenciária de Taiúva (Offline Standalone)
Exec=\"$SCRIPT_DIR/iniciar_como_aplicativo_linux.sh\"
Icon=$ICON_PATH
Path=$SCRIPT_DIR
Terminal=false
StartupNotify=true
Categories=Office;Database;
StartupWMClass=SistemaEstoque
Keywords=estoque;almoxarifado;percapita;gestao;taiuva;
"

echo -e "${BLUE}===============================================================================${NC}"
echo -e "${BLUE}   INSTALADOR DE ATALHO DE APLICATIVO - ÁREA DE TRABALHO LINUX${NC}"
echo -e "${BLUE}===============================================================================${NC}"

# 1. Instalar no Menu de Aplicativos do Usuário (~/.local/share/applications/)
APP_MENU_DIR="$HOME/.local/share/applications"
mkdir -p "$APP_MENU_DIR"
echo "$DESKTOP_CONTENT" > "$APP_MENU_DIR/sistema-estoque-percapita.desktop"
chmod +x "$APP_MENU_DIR/sistema-estoque-percapita.desktop"
echo -e "${GREEN}[1/2] Atalho instalado no Menu de Aplicativos do sistema.${NC}"

# 2. Instalar na Área de Trabalho (Desktop / Área de Trabalho)
DESKTOP_DIRS=("$HOME/Desktop" "$HOME/Área de Trabalho" "$HOME/Bureau" "$HOME/Escritorio")
INSTALLED_ON_DESKTOP=false

for D_DIR in "${DESKTOP_DIRS[@]}"; do
    if [ -d "$D_DIR" ]; then
        TARGET_FILE="$D_DIR/Sistema_Estoque_e_PerCapita.desktop"
        echo "$DESKTOP_CONTENT" > "$TARGET_FILE"
        chmod +x "$TARGET_FILE"
        
        # Habilitar confiança no GNOME/Ubuntu (elimina aviso 'Permitir Lançamento')
        if command -v gio &> /dev/null; then
            gio set "$TARGET_FILE" metadata::trusted true 2>/dev/null || true
        fi
        
        echo -e "${GREEN}[2/2] Ícone criado na sua Área de Trabalho: $TARGET_FILE${NC}"
        INSTALLED_ON_DESKTOP=true
    fi
done

if [ "$INSTALLED_ON_DESKTOP" = false ]; then
    mkdir -p "$HOME/Desktop"
    TARGET_FILE="$HOME/Desktop/Sistema_Estoque_e_PerCapita.desktop"
    echo "$DESKTOP_CONTENT" > "$TARGET_FILE"
    chmod +x "$TARGET_FILE"
    if command -v gio &> /dev/null; then
        gio set "$TARGET_FILE" metadata::trusted true 2>/dev/null || true
    fi
    echo -e "${GREEN}[2/2] Pasta Desktop criada e ícone adicionado em: $TARGET_FILE${NC}"
fi

echo -e "${GREEN}===============================================================================${NC}"
echo -e "${GREEN}  Instalação concluída com sucesso!${NC}"
echo -e "${GREEN}  Agora você pode abrir o sistema dando dois cliques no ícone da Área de Trabalho.${NC}"
echo -e "${GREEN}  Ele abrirá direto como aplicativo de computador, sem barra de navegação!${NC}"
echo -e "${GREEN}===============================================================================${NC}"
