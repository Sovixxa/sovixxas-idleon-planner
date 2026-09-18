@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install Node.js, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node server.js
endlocal
