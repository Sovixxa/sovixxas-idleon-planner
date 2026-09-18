@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this again.
  pause
  exit /b 1
)
if not exist ".git" (
  echo This folder is not a Git checkout yet.
  echo Connect the optimizer to its GitHub repo once, then use this launcher from then on.
  pause
  exit /b 1
)
set JELLY_AUTO_PULL=1
set JELLY_PULL_MS=3000
node server.js
endlocal
