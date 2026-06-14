@echo off
chcp 65001 >nul
title magic-cube launcher
cd /d "%~dp0"

echo ============================================
echo    魔方公式练习  一键启动
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [x] 未检测到 Node.js,请先安装:https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo [1/3] 首次运行,安装后端依赖...
  call npm install --prefix backend || goto :err
)
if not exist "frontend\node_modules" (
  echo [2/3] 首次运行,安装前端依赖...
  call npm install --prefix frontend || goto :err
)

echo [3/3] 启动服务(各开一个新窗口)...
start "magic-cube 后端 :3001" cmd /k "cd /d "%~dp0backend" && npm start"
start "magic-cube 前端 :5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo     等待前端就绪...
timeout /t 5 /nobreak >nul
start "" http://localhost:5173

echo.
echo ============================================
echo  已启动:
echo    前端  http://localhost:5173   (浏览器已自动打开)
echo    后端  http://localhost:3001
echo  局域网/公网访问:把 localhost 换成本机 IP,
echo    例如  http://192.168.1.10:5173
echo  关闭服务:直接关掉那两个新开的命令行窗口。
echo ============================================
echo.
echo (本窗口可以关闭)
pause
exit /b 0

:err
echo.
echo [x] 依赖安装失败,请检查网络或 Node.js 安装。
pause
exit /b 1
