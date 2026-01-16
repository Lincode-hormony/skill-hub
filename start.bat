@echo off
echo ========================================
echo   Universal Skill Hub 启动器
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    npm install
)

echo.
echo [2/3] 启动 Web UI...
echo.

REM 默认端口 3000，如果被占用可修改为其他端口
set PORT=3000
node server.js

pause
