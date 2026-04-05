@echo off
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" "start_scraper.py"
) else (
    where py >nul 2>&1
    if %errorlevel%==0 (
        py "start_scraper.py"
    ) else (
        where python >nul 2>&1
        if %errorlevel%==0 (
            python "start_scraper.py"
        ) else (
            echo Python wurde nicht gefunden.
            echo.
            echo Bitte installiere zuerst Python 3 fuer Windows und aktiviere dabei:
            echo - Add python.exe to PATH
            echo - Install launcher for all users ^(py^)
            echo.
            echo Danach im Ordner pdf_extractor einmal setup_windows.bat ausfuehren.
            echo.
            echo Anschliessend kannst du diese Datei erneut starten.
            goto :end
        )
    )
)

:end
pause
