@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo   ANAHTAR DOGRULAMA VE YUKLEME
echo ============================================================
echo.
node toolsnahtar-dogrula.mjs
echo.
pause
