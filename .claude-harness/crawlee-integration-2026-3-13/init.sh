#!/bin/bash
# Crawlee 集成任务 - 启动脚本
# 运行开发服务器、环境检查

echo "=== Crawlee Integration Harness ==="
echo "Date: 2026-03-13"
echo "Task: Integrate Crawlee framework while keeping existing services"
echo ""

# 检查 Node.js 版本
echo "Checking Node.js version..."
node -v

# 检查 pnpm
echo "Checking pnpm..."
pnpm -v

# 安装 Crawlee 依赖（如果尚未安装）
echo "Installing Crawlee dependencies..."
cd apps/crawler
pnpm list crawlee || pnpm add crawlee

# 返回根目录
cd ../..

echo ""
echo "=== Environment Ready ==="
echo "Next steps:"
echo "1. Read feature-list.json for pending tasks"
echo "2. Pick the next uncompleted task"
echo "3. Implement and mark as complete"
echo "4. Update progress.md"
