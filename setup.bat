@echo off
echo 🚀 Setting up Rainmakers Portal...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Create environment files
echo ⚙️ Creating environment files...

REM Backend .env
if not exist "backend\.env" (
    echo Creating backend\.env from template...
    copy "backend\env.example" "backend\.env"
    echo ⚠️  Please update backend\.env with your actual configuration values
) else (
    echo ✅ backend\.env already exists
)

REM Frontend .env
if not exist "frontend\.env" (
    echo Creating frontend\.env from template...
    copy "frontend\env.example" "frontend\.env"
    echo ⚠️  Please update frontend\.env with your actual configuration values
) else (
    echo ✅ frontend\.env already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Set up Firebase project and download service account key
echo 2. Update backend\.env with your Firebase configuration
echo 3. Update frontend\.env with your Discord and Microsoft app IDs
echo 4. Run 'npm run dev' to start both frontend and backend
echo.
echo 🔧 Configuration needed:
echo - Firebase project ID and service account key
echo - Discord OAuth app credentials
echo - GoHighLevel API key
echo - Microsoft Graph API credentials
echo.
echo 📚 See README.md for detailed setup instructions
pause
