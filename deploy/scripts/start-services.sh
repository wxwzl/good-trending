#!/bin/bash
#
# 服务器端服务启动脚本
# 一键安装依赖并启动所有服务
#
# 使用方法:
#   cd /workspace/good-trending/deploy
#   ./scripts/start-services.sh
#

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 部署目录（脚本的上级目录）
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 切换到部署目录
cd "$DEPLOY_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# 检查环境变量
# ============================================
if [ -z "$DATABASE_URL" ]; then
    log_warn "未设置 DATABASE_URL 环境变量"
    log_info "将使用 .env.production 中的配置"
fi

log_info "=========================================="
log_info "Good-Trending 服务启动脚本"
log_info "=========================================="
echo ""

# ============================================
# 1. 安装 API 依赖
# ============================================
log_info "[1/4] 安装 API 服务依赖..."
cd app/api
npm install --production
cd "$DEPLOY_DIR"
log_success "API 依赖安装完成"

# ============================================
# 2. 安装 Web 依赖
# ============================================
log_info "[2/4] 安装 Web 服务依赖..."
cd app/web
npm install --production
cd "$DEPLOY_DIR"
log_success "Web 依赖安装完成"

# ============================================
# 3. 安装 Scheduler 依赖
# ============================================
log_info "[3/4] 安装 Scheduler 服务依赖..."
cd app/scheduler
npm install --production
cd "$DEPLOY_DIR"
log_success "Scheduler 依赖安装完成"

# ============================================
# 4. 检查 PM2
# ============================================
log_info "[4/4] 检查 PM2..."
if ! command -v pm2 &>/dev/null; then
    log_info "安装 PM2..."
    npm install -g pm2
fi
log_success "PM2 已就绪"

# ============================================
# 5. 启动服务
# ============================================
echo ""
log_info "启动服务..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo ""
log_success "=========================================="
log_success "服务启动完成!"
log_success "=========================================="
echo ""
pm2 status
echo ""
echo "查看日志:"
echo "  pm2 logs"
echo ""
echo "停止服务:"
echo "  pm2 stop all"
echo ""
