#!/bin/bash
# 前端组件开发环境启动脚本

echo "🚀 启动前端组件开发环境..."

# 检查环境
echo "📋 环境检查..."
node --version
pnpm --version

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 安装图表库
echo "📊 安装 Recharts..."
pnpm --filter @good-trending/web add recharts

# 构建DTO包
echo "🔨 构建 @good-trending/dto..."
pnpm --filter @good-trending/dto build

# 启动开发服务器
echo "🌐 启动 Web 服务..."
pnpm --filter @good-trending/web dev
