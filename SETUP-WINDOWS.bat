@echo off
title Setup Kesiswaan
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Pasang Node.js 20 LTS dari https://nodejs.org lalu ulangi.
  pause
  exit /b 1
)
node scripts\setup-lokal.mjs --jalankan
pause
