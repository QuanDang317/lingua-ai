@echo off
chcp 65001 >nul
title LinguaAI - Fullstack Launcher (API :8000 + Web :3000)

echo ============================================================================
echo   LINGUAAI - AI-POWERED ADAPTIVE LANGUAGE LEARNING ^& VOICE TUTOR PLATFORM
echo ============================================================================
echo.

set ROOT_DIR=%~dp0

echo [1/4] Kiem tra moi truong Python Backend (apps\api)...
if not exist "%ROOT_DIR%apps\api\.venv\Scripts\python.exe" (
    echo Dang khoi tao Python virtual environment...
    cd /d "%ROOT_DIR%apps\api"
    python -m venv .venv
    call .\.venv\Scripts\pip.exe install -r requirements.txt
)

echo [2/4] Khoi tao Database Schema (22 bang) ^& AI Curriculum Seeder (EN + ZH)...
cd /d "%ROOT_DIR%apps\api"
call .\.venv\Scripts\python.exe -m app.seeds.run_seed

echo [3/4] Khoi chay FastAPI Backend + Realtime Voice WebSocket Gateway (Port 8000)...
start "LinguaAI Backend API (Port 8000)" cmd /k "cd /d "%ROOT_DIR%apps\api" && .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [4/4] Khoi chay Next.js Frontend (Port 3000)...
if not exist "%ROOT_DIR%apps\web\node_modules" (
    echo Dang cai dat npm dependencies cho Frontend...
    cd /d "%ROOT_DIR%apps\web"
    call npm install
)
start "LinguaAI Web Frontend (Port 3000)" cmd /k "cd /d "%ROOT_DIR%apps\web" && npm run dev"

echo.
echo Dang doi he thong khoi dong (4 giay)...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo ============================================================================
echo   HOAN TAT!
echo   - Frontend Web UI:    http://localhost:3000
echo   - Backend Swagger UI: http://localhost:8000/docs
echo   - Tai khoan mau:      learner@lingua.ai / LinguaAI@2026
echo   - Dung du an:         Chay file stop.bat hoac dong 2 cua so terminal.
echo ============================================================================
pause
