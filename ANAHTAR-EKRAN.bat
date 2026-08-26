@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo   ANAHTAR EKRANI
echo ============================================================
echo.
echo Tarayicida acilan sayfaya anahtari yapistirin.
echo Bu pencereyi kapatmayin; islem bitince kendi kapanir.
echo.
start http://127.0.0.1:8799
node "tools/anahtar-ekran.mjs"
echo.
pause
