Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Starting Multi-Agent DevOps Incident Management System" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Start Backend in a background process
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn app.main:app --reload --port 8000" -PassThru

Start-Sleep -Seconds 2

# 2. Start Frontend in a background process
Write-Host "[2/2] Starting React + Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -PassThru

Write-Host "`nSystem is booting up!" -ForegroundColor Yellow
Write-Host "• Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "• Backend API & Docs: http://localhost:8000/docs" -ForegroundColor White
