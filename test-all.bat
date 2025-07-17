@echo off
setlocal enabledelayedexpansion

:main_start
echo.
echo 🧪 Krapi CMS - Test Runner (Windows)
echo ====================================
echo.

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is not installed. Please install pnpm first.
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [INFO] Starting test execution at %time%
echo.

REM Run Frontend Tests
echo ========================================
echo 🎨 FRONTEND TESTS (Next.js + TypeScript)
echo ========================================
cd admin-frontend

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call pnpm install
    echo.
)

echo [INFO] Running frontend tests...
call pnpm test:coverage
set "frontend_exit_code=%errorlevel%"

if %frontend_exit_code% equ 0 (
    echo.
    echo [SUCCESS] ✅ Frontend tests passed!
    set "frontend_passed=true"
) else (
    echo.
    echo [ERROR] ❌ Frontend tests failed (exit code: %frontend_exit_code%)
    set "frontend_passed=false"
)

echo.
echo ========================================
echo 🔧 BACKEND TESTS (Node.js + TypeScript)
echo ========================================
cd ..\api-server

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call pnpm install
    echo.
)

echo [INFO] Running backend tests...
call pnpm test:coverage
set "backend_exit_code=%errorlevel%"

if %backend_exit_code% equ 0 (
    echo.
    echo [SUCCESS] ✅ Backend tests passed!
    set "backend_passed=true"
) else (
    echo.
    echo [ERROR] ❌ Backend tests failed (exit code: %backend_exit_code%)
    set "backend_passed=false"
)

cd ..

echo.
echo ========================================
echo 📊 RESULTS SUMMARY
echo ========================================

if "!frontend_passed!"=="true" (
    echo Frontend: ✅ PASSED
) else (
    echo Frontend: ❌ FAILED
)

if "!backend_passed!"=="true" (
    echo Backend:  ✅ PASSED  
) else (
    echo Backend:  ❌ FAILED
)

echo.
if "!frontend_passed!"=="true" if "!backend_passed!"=="true" (
    echo 🎉 ALL TESTS PASSED!
    echo.
    echo 📋 Coverage reports:
    echo   - Frontend: admin-frontend\coverage\lcov-report\index.html
    echo   - Backend:  api-server\coverage\lcov-report\index.html
) else (
    echo 💥 SOME TESTS FAILED
    echo.
    echo 🔧 Common Issues:
    echo.
    if not "!frontend_passed!"=="true" (
        echo Frontend Problems:
        echo   - Component tests expect different UI than current implementation
        echo   - Check console output above for specific test failures
        echo   - Try: cd admin-frontend ^&^& pnpm test --verbose
        echo.
    )
    if not "!backend_passed!"=="true" (
        echo Backend Problems:
        echo   - TypeScript compilation errors in test files
        echo   - Missing imports or type mismatches
        echo   - Try: cd api-server ^&^& npx tsc --noEmit
        echo.
    )
)

echo.
echo ========================================
echo 💬 OPTIONS
echo ========================================
echo.
echo What would you like to do?
echo   [R] Run all tests again
echo   [F] Run frontend tests only
echo   [B] Run backend tests only
echo   [E] Exit
echo.

choice /c RFBE /n /m "Your choice: "

if errorlevel 4 goto exit_script
if errorlevel 3 goto run_backend_only
if errorlevel 2 goto run_frontend_only
if errorlevel 1 goto main_start

:run_frontend_only
echo.
echo Running frontend tests only...
cd admin-frontend
call pnpm test:coverage
cd ..
goto show_options

:run_backend_only
echo.
echo Running backend tests only...
cd api-server
call pnpm test:coverage
cd ..
goto show_options

:show_options
echo.
echo Press any key to return to main menu...
pause >nul
goto main_start

:exit_script
echo.
echo Goodbye! 👋
exit /b 0 