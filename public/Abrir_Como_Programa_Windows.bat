@echo off
title Abrir Sistema de Gestao On-Premise em Modo Programa
echo ========================================================
echo Iniciando Sistema de Gestao em Janela de Aplicativo
echo (Sem guias do navegador e sem barra de navegacao)
echo ========================================================
set URL=http://localhost:3000

if not "%~1"=="" set URL=%~1

where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start msedge --app="%URL%"
    exit /b 0
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start chrome --app="%URL%"
    exit /b 0
)

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%URL%"
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%URL%"
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%URL%"
    exit /b 0
)

start "" "%URL%"
exit /b 0
