@echo off
setlocal
cd /d "%~dp0"
title SC360 Expedite Intelligence
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install the current Node.js LTS release, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo Starting SC360 without npm install...
start "" "http://localhost:4173"
node server.mjs
if errorlevel 1 (
  echo.
  echo SC360 stopped unexpectedly.
  pause
)
