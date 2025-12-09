@echo off
echo Testing specific user ID: 69281cceb101ba459c6ece58
echo.
echo Make sure backend is running on port 5000
echo.
pause

REM Get admin token first (you'll need to replace with your actual admin credentials)
echo Enter admin email:
set /p ADMIN_EMAIL=
echo Enter admin password:
set /p ADMIN_PASSWORD=

echo.
echo Logging in...
curl -X POST http://localhost:5000/api/admin/login -H "Content-Type: application/json" -d "{\"email\":\"%ADMIN_EMAIL%\",\"password\":\"%ADMIN_PASSWORD%\"}" > temp_token.json

echo.
echo.
echo Testing user fetch...
echo.

REM You'll need to manually extract the token and run this:
echo Please run this command with your admin token:
echo curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:5000/api/admin/users/69281cceb101ba459c6ece58

pause
