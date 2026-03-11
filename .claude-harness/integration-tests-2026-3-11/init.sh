#!/bin/bash
# 集成测试环境启动脚本

echo "🚀 启动集成测试环境..."

# 检查环境
echo "📋 环境检查..."
node --version
pnpm --version

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建所有包
echo "🔨 构建所有包..."
pnpm build

# 启动测试数据库
echo "🐘 启动测试数据库..."
docker-compose -f docker-compose.test.yml up -d postgres redis

# 运行迁移
echo "🔄 运行数据库迁移..."
pnpm --filter @good-trending/database migrate

# 启动API服务（测试模式）
echo "🌐 启动 API 服务（测试模式）..."
NODE_ENV=test pnpm --filter @good-trending/api start:prod &

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

echo "✅ 测试环境准备完成"
echo "运行 API 测试: pnpm --filter @good-trending/tests test:api"
echo "运行 E2E 测试: pnpm --filter @good-trending/tests test:e2e"
