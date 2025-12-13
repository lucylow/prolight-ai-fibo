@echo off
REM ProLight AI Installation Script for Windows

echo.
echo 🚀 ProLight AI Installation Script
echo ==================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check for Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python 3 is not installed. Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

echo 📋 Checking prerequisites...
echo ✅ Node.js version:
node --version
echo ✅ Python version:
python --version
echo.

REM Frontend setup
echo 📦 Installing Frontend Dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Frontend installation failed
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed
echo.

REM Backend setup
echo 📦 Setting up Backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend installation failed
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

REM Setup environment file
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit backend\.env with your API keys
)

cd ..

REM Frontend environment
if not exist ".env.local" (
    echo Creating frontend .env.local...
    (
        echo VITE_API_URL=http://localhost:8000
    ) > .env.local
    echo ✅ Frontend .env.local created
)

echo.
echo ✅ Installation Complete!
echo.
echo 📚 Next Steps:
echo ============
echo.
echo 1. Configure API Keys:
echo    - Edit backend\.env
echo    - Add FIBO_API_KEY from https://www.bria.ai/
echo    - (Optional) Add GEMINI_API_KEY
echo.
echo 2. Start Development Servers:
echo.
echo    Terminal 1 - Frontend:
echo    npm run dev
echo.
echo    Terminal 2 - Backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python -m app.main
echo.
echo 3. Access the Application:
echo    - Frontend: http://localhost:5173
echo    - Backend: http://localhost:8000
echo    - API Docs: http://localhost:8000/docs
echo.
echo 📖 For more information, see SETUP.md
echo.
pause
