@echo off
echo ================================================================
echo  Starting Multi-Agent DevOps Incident Management System
echo ================================================================

start "Multi-Agent Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "Multi-Agent Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo System launched:
echo Dashboard: http://localhost:5173
echo API Docs: http://localhost:8000/docs
