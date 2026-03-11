#!/bin/bash
# 页面集成开发环境启动脚本

echo "🚀 启动页面集成开发环境..."

# 检查环境
echo "📋 环境检查..."
node --version
pnpm --version

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建DTO包
echo "🔨 构建 @good-trending/dto..."
pnpm --filter @good-trending/dto build

# 启动API服务（后台）
echo "🌐 启动 API 服务..."
pnpm --filter @good-trending/api dev &

# 启动Web服务
echo "🌐 启动 Web 服务..."
pnpm --filter @good-trending/web dev
