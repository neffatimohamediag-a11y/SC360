@echo off
setlocal
cd /d "%~dp0"
title SC360 Development Setup
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS first.
  pause
  exit /b 1
)
echo Installing from the public npm registry...
call npm config set registry https://registry.npmjs.org/
call npm install
if errorlevel 1 (
  echo.
  echo Installation failed. Check your internet, proxy, firewall, or company network settings.
  pause
  exit /b 1
)
call npm run dev
