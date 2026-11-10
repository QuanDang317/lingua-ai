@echo off
chcp 65001 >nul
title LinguaAI - Master Verification Suite (Phases 1-6)
echo ============================================================================
echo   LINGUAAI - MASTER FULL-STACK VERIFICATION SUITE (PHASES 1 TO 6)
echo ============================================================================
echo.

echo [1/2] Running Backend End-to-End Tests across all 6 Phases...
cd /d "%~dp0apps\api"
call .\.venv\Scripts\python.exe -m tests.run_all_e2e
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend E2E verification failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Frontend Strict TypeScript Verification (npx tsc --noEmit)...
cd /d "%~dp0apps\web"
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend TypeScript verification failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ============================================================================
echo   SUCCESS: ALL 6 PHASES (BACKEND + FRONTEND) VERIFIED 100%% PASS!
echo ============================================================================
cd /d "%~dp0"
