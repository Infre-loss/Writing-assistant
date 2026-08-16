@echo off
chcp 65001 >nul
title 写作助手项目 - 恢复到上次备份
set "ROOT=%~dp0"
set "GIT="

where git >nul 2>nul && set "GIT=git"
if not defined GIT if exist "D:\Git\cmd\git.exe" set "GIT=D:\Git\cmd\git.exe"
if not defined GIT if exist "C:\Program Files\Git\cmd\git.exe" set "GIT=C:\Program Files\Git\cmd\git.exe"
if not defined GIT if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT=C:\Program Files (x86)\Git\cmd\git.exe"
if not defined GIT (
  echo.
  echo [错误] 没有找到 Git。请先安装：https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

cd /d "%ROOT%"
echo.
echo 将把整个项目恢复到【上次备份】时的状态。
echo 警告：上次备份之后、还没保存的改动会丢失！
echo.
choice /C YN /M "确定继续吗（Y=继续 N=取消）"
if errorlevel 2 exit /b

"%GIT%" reset --hard HEAD
if %errorlevel%==0 (
  echo.
  echo [完成] 已恢复到上次备份！
) else (
  echo.
  echo [提示] 恢复失败：可能是还没有任何备份（仓库是空的）。
)
echo.
pause
