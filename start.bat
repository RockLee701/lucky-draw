@echo off
chcp 65001
echo.
echo 🎉 年会抽奖系统启动中...
echo.

REM 检查是否安装了Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未检测到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查依赖是否安装
if not exist "server\node_modules" (
    echo 📦 正在安装后端依赖...
    cd server
    call npm install
    cd ..
)

if not exist "client\node_modules" (
    echo 📦 正在安装前端依赖...
    cd client
    call npm install
    cd ..
)

REM 检查是否已构建
if not exist "client\dist" (
    echo 🔨 正在构建前端...
    cd client
    call npm run build
    cd ..
)

echo.
echo 🚀 正在启动服务...
echo.

REM 启动服务
cd server
node src/app.js

pause