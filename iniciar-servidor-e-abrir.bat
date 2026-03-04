@echo off
title SGC Seteg - Servidor Local
color 0A
echo.
echo ========================================
echo   SGC SETEG - Servidor Local
echo ========================================
echo.
echo Iniciando servidor na porta 8080...
echo.
echo O navegador abrira automaticamente!
echo.
echo Pressione Ctrl+C para parar o servidor
echo ========================================
echo.
cd /d "%~dp0"
start http://localhost:8080/index.html
live-server --port=8080 --entry-file=index.html --no-browser
pause
