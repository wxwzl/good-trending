#!/bin/bash
# AI分析服务 & 架构重构 - 启动脚本

set -e

echo "🚀 启动 AI 分析服务开发环境"

# 检查 Node.js 版本
node --version

# 检查 pnpm
pnpm --version

# 安装依赖（如果需要）
echo "📦 检查依赖..."
pnpm install

# 构建共享包
echo "🔨 构建共享包..."
pnpm --filter @good-trending/shared build
pnpm --filter @good-trending/database build

# 类型检查
echo "🔍 类型检查..."
pnpm --filter @good-trending/crawler typecheck || true

# 启动开发服务器（可选）
# pnpm dev:api &

echo "✅ 环境准备完成"
echo ""
echo "当前任务: AI 分析公共服务实现 & 架构重构"
echo "查看功能清单: cat .claude-harness/ai-analysis-refactor-2026-3-11/feature-list.json"
echo ""
