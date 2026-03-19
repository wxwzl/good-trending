#!/bin/bash
# 启动脚本 - 每次会话开始时运行

echo "=== Crawler & Scheduler 重构任务 ==="
echo "工作目录: $(pwd)"
echo ""

echo "=== 最近 Git 记录 ==="
git log --oneline -5
echo ""

echo "=== 当前 Git 状态 ==="
git status --short
echo ""

echo "=== TypeScript 编译检查（scheduler）==="
pnpm --filter @good-trending/scheduler exec tsc --noEmit 2>&1 | head -20 || echo "编译检查完成"
echo ""

echo "=== TypeScript 编译检查（crawler）==="
pnpm --filter @good-trending/crawler exec tsc --noEmit 2>&1 | head -20 || echo "编译检查完成"
echo ""

echo "=== 就绪，可以开始工作 ==="
