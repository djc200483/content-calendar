@echo off
REM Development script for Content Calendar MVP (Windows)
REM This script starts both the frontend and backend servers

echo 🚀 Starting Content Calendar MVP Development Environment
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
call npm install

echo 📦 Installing backend dependencies...
cd api
call npm install
cd ..

echo.
echo 🌐 Starting backend server on http://localhost:3001
echo 🎨 Starting frontend server on http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend server in background
start "Backend Server" cmd /c "cd api && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
start "Frontend Server" cmd /c "npm run dev"

echo ✅ Both servers are starting...
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:3001
echo.
echo Press any key to exit...
pause >nul 