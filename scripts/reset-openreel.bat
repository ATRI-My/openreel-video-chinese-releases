@echo off
echo ===================================
echo   OpenReel Video - Reset App Data
echo ===================================
echo.

set TARGET=%APPDATA%\openreel

if not exist "%TARGET%" goto notfound

echo Will delete: %TARGET%
echo.
echo This clears ALL user data:
echo   - Window position/size
echo   - Project data (IndexedDB)
echo   - Auto-save / crash recovery
echo   - Settings, preferences, shortcuts
echo   - Encrypted API keys
echo   - Theme, language, welcome screen skip
echo.

set /p CONFIRM=Confirm delete? (y/n): 
if /i not "%CONFIRM%"=="y" goto cancelled

rmdir /s /q "%TARGET%"
echo.
echo Data cleared. Next launch will be like first use.
goto end

:notfound
echo Data folder not found: %TARGET%
goto end

:cancelled
echo Cancelled.
goto end

:end
echo.
pause
