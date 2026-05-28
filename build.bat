@echo off
setlocal enabledelayedexpansion

set SOURCE_REPO=https://github.com/ATRI-My/openreel-video.git
set SOURCE_BRANCH=i18n/chinese-support
set SOURCE_DIR=source
set BUILD_DIR=%~dp0
set RELEASE_DIR=%BUILD_DIR%release

echo ===================================
echo   OpenReel Video - Build & Package
echo ===================================
echo.

:: Step 1: Clone / pull source
if exist "%SOURCE_DIR%" (
    echo [1/6] Pulling latest source...
    cd /d "%SOURCE_DIR%"
    git pull origin %SOURCE_BRANCH%
    cd /d "%BUILD_DIR%"
) else (
    echo [1/6] Cloning source from %SOURCE_REPO%...
    git clone --branch %SOURCE_BRANCH% %SOURCE_REPO% "%SOURCE_DIR%"
)
if errorlevel 1 (
    echo ERROR: Failed to clone/pull source.
    pause
    exit /b 1
)

:: Step 2: Copy electron config into source
echo [2/6] Copying electron config...
copy /y "%BUILD_DIR%package.json" "%SOURCE_DIR%\" >nul
copy /y "%BUILD_DIR%electron-builder.yml" "%SOURCE_DIR%\" >nul
copy /y "%BUILD_DIR%after-pack.js" "%SOURCE_DIR%\" >nul
xcopy /y /e "%BUILD_DIR%electron" "%SOURCE_DIR%\electron\" >nul
xcopy /y /e "%BUILD_DIR%assets" "%SOURCE_DIR%\assets\" >nul

:: Step 3: Install dependencies
echo [3/6] Installing dependencies...
cd /d "%SOURCE_DIR%"
call pnpm install
if errorlevel 1 (
    echo ERROR: pnpm install failed.
    cd /d "%BUILD_DIR%"
    pause
    exit /b 1
)

:: Step 4: Build web
echo [4/6] Building web application...
call pnpm build
if errorlevel 1 (
    echo ERROR: Build failed.
    cd /d "%BUILD_DIR%"
    pause
    exit /b 1
)

:: Step 5: Copy FFmpeg core files into dist for offline/local use
echo [5/6] Copying FFmpeg core files for local use...
if not exist "apps\web\dist\ffmpeg\core" mkdir "apps\web\dist\ffmpeg\core"
xcopy /y /e "node_modules\@ffmpeg\core\dist\esm\*" "apps\web\dist\ffmpeg\core\" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Failed to copy @ffmpeg/core files.
)
if not exist "apps\web\dist\ffmpeg\core-mt" mkdir "apps\web\dist\ffmpeg\core-mt"
xcopy /y /e "node_modules\@ffmpeg\core-mt\dist\esm\*" "apps\web\dist\ffmpeg\core-mt\" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Failed to copy @ffmpeg/core-mt files.
)

:: Step 6: Package Electron
echo [6/6] Packaging Electron app...
call pnpm electron:dist
if errorlevel 1 (
    echo ERROR: Packaging failed.
    cd /d "%BUILD_DIR%"
    pause
    exit /b 1
)

:: Copy output to releases folder
if exist "%SOURCE_DIR%\release\OpenReel-Video-Setup-*.exe" (
    if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"
    copy /y "%SOURCE_DIR%\release\OpenReel-Video-Setup-*.exe" "%RELEASE_DIR%\" >nul
)

cd /d "%BUILD_DIR%"
echo.
echo ===================================
echo   Build complete!
echo   Output: %SOURCE_DIR%\release\
echo ===================================
echo.
pause
