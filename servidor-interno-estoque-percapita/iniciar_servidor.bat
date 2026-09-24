@echo off
chcp 65001 >nul
title Sistema de Estoque e Per Capita - Servidor Interno Fechado
color 0B

echo ===============================================================================
echo            SISTEMA DE ESTOQUE / ALMOXARIFADO E PER CAPITA
echo               SERVIDOR INTERNO FECHADO (ON-PREMISE / SEM INTERNET)
echo ===============================================================================
echo.

REM 1. Verificar se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO CRITICO] O Node.js nao foi encontrado no sistema!
    echo.
    echo Por favor, instale o Node.js versao 18 ou superior:
    echo https://nodejs.org/ (Instalador LTS)
    echo.
    echo Apos instalar, execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js detectado com sucesso:
node -v
echo.

REM 2. Verificar dependencias
if not exist "node_modules\" (
    echo [2/3] Instalando dependencias do projeto pela primeira vez...
    echo Isso pode levar alguns minutos. Aguarde...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERRO] Falha ao instalar dependencias do npm.
        pause
        exit /b 1
    )
) else (
    echo [2/3] Dependencias já instaladas.
)
echo.

REM 3. Verificar build do frontend
if not exist "dist\" (
    echo [3/3] Gerando arquivos de producao (build)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [AVISO] Falha ao gerar build. O servidor rodara em modo API.
    )
) else (
    echo [3/3] Arquivos de producao (dist) prontos.
)
echo.

echo ===============================================================================
echo  Iniciando Servidor Interno Fechado na porta 3000...
echo  Para encerrar o servidor a qualquer momento, feche esta janela ou aperte Ctrl+C.
echo ===============================================================================
echo.

REM Abrir o navegador automaticamente apos 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

REM Iniciar servidor
node server.js

pause
