@echo off
title Kesiswaan - build ulang
cd /d "%~dp0"
node scripts\jalankan-lokal.mjs --build
pause
