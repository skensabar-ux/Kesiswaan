@echo off
title Kesiswaan - http://localhost:3000
cd /d "%~dp0"
rem buka browser setelah server siap (sekitar 10 detik)
start "" cmd /c "timeout /t 10 >nul & start http://localhost:3000"
npm run dev
pause
