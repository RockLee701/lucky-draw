# 安装步骤

## 1. 清理旧的依赖

cd server
rd /s /q node_modules
del package-lock.json

## 2. 重新安装依赖

npm install

## 3. 启动服务

npm start

## 或者使用根目录的启动脚本

cd ..
npm start