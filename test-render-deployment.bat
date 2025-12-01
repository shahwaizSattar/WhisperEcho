@echo off
echo ========================================
echo   Testing Render Deployment
echo ========================================
echo.

echo 1. Testing API endpoint...
curl -s https://echo-yddc.onrender.com/api/health || echo API not responding yet

echo.
echo 2. Testing media endpoint...
curl -s -I https://echo-yddc.onrender.com/uploads/ || echo Media endpoint not ready

echo.
echo 3. Checking deployment status...
echo Visit: https://dashboard.render.com to check deployment progress

echo.
echo ========================================
echo   Fix Production URLs (Run After Deploy)
echo ========================================
echo.
echo Once deployment is complete, run:
echo   cd backend
echo   node fix-production-urls.js
echo.
echo This will update all media URLs in the database to use:
echo   https://echo-yddc.onrender.com
echo.
pause