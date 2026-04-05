@echo off
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

where py >nul 2>&1
if %errorlevel% neq 0 (
    where python >nul 2>&1
    if %errorlevel% neq 0 (
        echo Python wurde nicht gefunden.
        echo Bitte installiere zuerst Python 3 und aktiviere im Installer:
        echo - Add python.exe to PATH
        echo - Install launcher for all users ^(py^)
        goto :end
    )
)

if not exist ".venv\Scripts\python.exe" (
    echo Erstelle virtuelle Umgebung...
    where py >nul 2>&1
    if %errorlevel%==0 (
        py -m venv .venv
    ) else (
        python -m venv .venv
    )
    if errorlevel 1 (
        echo Die virtuelle Umgebung konnte nicht erstellt werden.
        goto :end
    )
)

echo Installiere Abhaengigkeiten aus requirements.txt...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :install_failed

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :install_failed

echo.
echo Fertig. Du kannst jetzt start_scraper.bat doppelklicken.
echo.
echo Hinweis:
echo Wenn deine PDFs gescannt oder bildbasiert sind, brauchst du zusaetzlich Tesseract OCR.
echo Ohne Tesseract koennen solche Seiten nicht gelesen werden.
goto :end

:install_failed
echo.
echo Die Installation der Abhaengigkeiten ist fehlgeschlagen.
echo Pruefe bitte Internetzugang und Python-Installation.

:end
pause
