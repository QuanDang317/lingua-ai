@echo off
chcp 65001 >nul
title LinguaAI - Stop All Services

echo Dang dung cac tien trinh LinguaAI tren cong 8000 va 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo Da dung toan bo dich vu LinguaAI.
pause
