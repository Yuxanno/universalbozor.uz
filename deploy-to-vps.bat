@echo off
REM VPS Deploy Script for Windows
REM Bu script loyihani to'g'ridan-to'g'ri VPS'ga yuklaydi

echo ========================================
echo Universal.uz - VPS Deploy Script
echo ========================================
echo.

REM VPS ma'lumotlari (o'zgartirishingiz kerak)
set VPS_USER=root
set VPS_HOST=your-vps-ip
set VPS_PATH=/var/www/universal-uz

echo VPS ma'lumotlari:
echo User: %VPS_USER%
echo Host: %VPS_HOST%
echo Path: %VPS_PATH%
echo.
set /p CONFIRM="Davom etamizmi? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Bekor qilindi.
    exit /b
)

REM 1. Build
echo.
echo [1/6] Building project...
call npm run build:production
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

REM 2. Arxiv yaratish
echo.
echo [2/6] Creating archive...
set ARCHIVE_NAME=universal-uz-%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.zip
set ARCHIVE_NAME=%ARCHIVE_NAME: =0%

REM PowerShell bilan zip yaratish
powershell -Command "& {$exclude = @('node_modules', '.git', '*.log', '.env'); Get-ChildItem -Path . -Recurse | Where-Object {$_.FullName -notmatch ($exclude -join '|')} | Compress-Archive -DestinationPath '%ARCHIVE_NAME%' -Force}"

echo Archive created: %ARCHIVE_NAME%

REM 3. VPS'ga yuklash
echo.
echo [3/6] Uploading to VPS...
echo Using SCP (WinSCP yoki pscp kerak)
echo.
echo Manual upload qiling:
echo 1. WinSCP ochib %VPS_HOST% ga ulanish
echo 2. %ARCHIVE_NAME% faylini /tmp/ ga yuklash
echo.
pause

REM 4. SSH orqali deploy
echo.
echo [4/6] SSH orqali deploy qilish...
echo.
echo Manual deploy qiling:
echo 1. PuTTY yoki SSH client ochish
echo 2. ssh %VPS_USER%@%VPS_HOST%
echo 3. Quyidagi komandalarni ishga tushirish:
echo.
echo    mkdir -p %VPS_PATH%
echo    cd /tmp
echo    unzip %ARCHIVE_NAME% -d %VPS_PATH%
echo    cd %VPS_PATH%
echo    npm install --production
echo    cd client ^&^& npm install --production ^&^& cd ..
echo    cd server ^&^& npm install --production ^&^& cd ..
echo.
pause

echo.
echo ========================================
echo Deploy completed!
echo ========================================
echo.
echo Next steps:
echo 1. SSH: ssh %VPS_USER%@%VPS_HOST%
echo 2. Configure: cd %VPS_PATH% ^&^& nano server/.env
echo 3. Start: npm run start:pm2
echo 4. Nginx: sudo cp nginx.conf /etc/nginx/nginx.conf
echo.
pause
