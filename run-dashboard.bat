@echo off
REM SPPL Dashboard Startup Script

echo.
echo ========================================
echo   SPPL Operations Dashboard
echo ========================================
echo.
echo Starting backend server...
start cmd /k "npm run dev:backend"

timeout /t 2 /nobreak

echo.
echo Starting frontend...
start cmd /k "npm run dev:frontend"

echo.
echo ========================================
echo Dashboard is starting!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo ========================================
echo.
pause
