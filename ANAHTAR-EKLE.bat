@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo   YEDEK SAGLAYICI ANAHTARI - DOGRULA VE YUKLE
echo ============================================================
echo.
echo Once bu klasorde "anahtar.txt" dosyasi olusturup API
echo anahtarini icine yapistirin ve kaydedin.
echo.
echo Saglayici secmek icin: ANAHTAR-EKLE.bat gemini
echo Bos birakilirsa OpenAI denenir.
echo.
node "tools/anahtar-dogrula.mjs" %1
echo.
pause
