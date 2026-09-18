@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 (
  echo Git was not found. Install Git for Windows, then run this again.
  pause
  exit /b 1
)
if not exist ".git" (
  echo This bootstrap is missing its Git history. Use the live-seed build.
  pause
  exit /b 1
)
set /p JELLY_REMOTE=Paste the GitHub repository URL: 
if "%JELLY_REMOTE%"=="" exit /b 1
git remote remove origin >nul 2>nul
git remote add origin "%JELLY_REMOTE%"
git fetch origin
if errorlevel 1 (
  echo.
  echo Could not fetch that repository. Nothing was overwritten.
  pause
  exit /b 1
)
git branch -M main
git branch --set-upstream-to=origin/main main >nul 2>nul
if errorlevel 1 (
  echo The remote does not have origin/main yet. That is okay if it has not been published yet.
) else (
  echo Connected. From now on use start-live-git.bat.
)
pause
endlocal
