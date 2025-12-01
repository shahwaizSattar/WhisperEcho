@echo off
echo ========================================
echo   Pushing to WhisperEcho Repository
echo ========================================
echo.

echo 1. Checking current remotes...
git remote -v

echo.
echo 2. Adding WhisperEcho remote (if not exists)...
git remote add whisperecho https://github.com/shahwaizSattar/WhisperEcho.git 2>nul || echo WhisperEcho remote already exists

echo.
echo 3. Pushing to WhisperEcho repository...
git push whisperecho main

echo.
echo ========================================
echo   Push to WhisperEcho Complete!
echo ========================================
echo.
echo If Render is connected to WhisperEcho, it should now deploy automatically.
echo Check deployment status at: https://dashboard.render.com
echo.
pause