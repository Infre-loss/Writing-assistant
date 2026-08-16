@echo off
title Writing Assistant Project - One-Click Backup
set "ROOT=%~dp0"
set "GIT="

where git >nul 2>nul && set "GIT=git"
if not defined GIT if exist "D:\Git\cmd\git.exe" set "GIT=D:\Git\cmd\git.exe"
if not defined GIT if exist "C:\Program Files\Git\cmd\git.exe" set "GIT=C:\Program Files\Git\cmd\git.exe"
if not defined GIT if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT=C:\Program Files (x86)\Git\cmd\git.exe"
if not defined GIT (
  echo.
  echo [ERROR] Git not found. Please install it first: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

cd /d "%ROOT%"
echo.
echo Saving project progress...
"%GIT%" add -A
"%GIT%" commit -m "one-click backup %date% %time%"
if %errorlevel%==0 (
  echo [OK] Progress saved as a new version.
) else (
  echo [INFO] No new changes to save.
)
echo.
echo Pushing to GitHub (if connected)...
"%GIT%" push
if %errorlevel%==0 (
  echo [OK] Uploaded to GitHub!
) else (
  echo [WARN] Push failed: remote not connected yet, or login needed on first push.
)
echo.
pause
