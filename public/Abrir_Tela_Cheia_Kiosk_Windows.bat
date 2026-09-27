@echo off
title Abrir Sistema de Gestao em Tela Cheia Kiosk
echo ========================================================
echo Iniciando Sistema em Modo Kiosk (100%% Tela Cheia)
echo (Sem guias, sem barra de navegacao e sem barra de tarefas)
echo Pressione ALT + F4 ou F11 para sair de tela cheia.
echo ========================================================
set URL=http://localhost:3000

if not "%~1"=="" set URL=%~1

where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start msedge --kiosk "%URL%" --edge-kiosk-type=fullscreen
    exit /b 0
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start chrome --kiosk "%URL%"
    exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "%URL%"
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "%URL%"
    exit /b 0
)

start "" "%URL%"
exit /b 0
