@echo off
echo Starting WhisperEcho Admin Panel...
echo.

cd /d "%~dp0"

echo Installing dependencies...
call npm install

echo.
echo Starting development server...
echo Admin Panel will be available at: http://localhost:3000
echo.

call npm start

pause