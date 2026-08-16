@echo off
chcp 65001 >nul
title 写作助手项目 - 一键备份（保存进度 + 上传 GitHub）
set "ROOT=%~dp0"
set "GIT="

REM ---- 查找 Git：优先 PATH，其次 D:\Git（本机安装位置）等常见路径 ----
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
echo 正在保存项目进度（提交所有改动）...
"%GIT%" add -A
"%GIT%" commit -m "一键备份 %date% %time%"
if %errorlevel%==0 (
  echo [完成] 进度已保存为一个新版本！
) else (
  echo [提示] 没有新改动需要保存（当前进度已是最新）。
)
echo.
echo 正在推送到 GitHub（如果已连接远程仓库）...
"%GIT%" push
if %errorlevel%==0 (
  echo [完成] 已上传到 GitHub！
) else (
  echo [提示] 推送失败：可能还没连接 GitHub，或首次推送需要登录授权。
)
echo.
pause
