@echo off
chcp 65001 > nul
title Sistema de Estoque e Per Capita - Modo Aplicativo

echo ===============================================================================
echo     SISTEMA DE ESTOQUE E PER CAPITA - MODO APLICATIVO NATIVO (WINDOWS)
echo     Executando em janela dedicada sem barra de internet
echo ===============================================================================

set "URL=http://localhost:3000"

:: 1. Verificar se o servidor já está rodando
netstat -ano | findstr ":3000" > nul
if %errorlevel% neq 0 (
    echo [1/2] Servidor nao detectado. Iniciando servidor local em segundo plano...
    start /b "" node server.js
    timeout /t 2 /nobreak > nul
) else (
    echo [1/2] Servidor ativo na porta 3000.
)

:: 2. Abrir como janela nativa de aplicativo usando Microsoft Edge ou Google Chrome
echo [2/2] Abrindo aplicativo em janela dedicada sem barra de endereco...

:: Tentar Microsoft Edge (presente em 100% dos Windows 10 e 11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --window-size=1440,900
    goto fim
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%URL%" --window-size=1440,900
    goto fim
)

:: Tentar Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=1440,900
    goto fim
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=1440,900
    goto fim
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app="%URL%" --window-size=1440,900
    goto fim
)

:: Fallback se nenhum for encontrado
start "" "%URL%"

:fim
echo.
echo Aplicativo aberto com sucesso!
exit
