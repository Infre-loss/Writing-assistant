@echo off
title Writing Assistant Project - Restore Last Backup
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
echo This will restore the whole project to the LAST BACKUP state.
echo WARNING: changes made after the last backup will be LOST!
echo.
choice /C YN /M "Continue? (Y=Yes N=No)"
if errorlevel 2 exit /b

"%GIT%" reset --hard HEAD
"%GIT%" clean -fd
if %errorlevel%==0 (
  echo.
  echo [OK] Restored to the last backup.
) else (
  echo.
  echo [INFO] Restore failed: no backup exists yet.
)
echo.
pause
