#!/bin/bash
#
# Good-Trending 自动部署脚本
# 构建并部署 api, web, scheduler 服务到 /workspace
#
# 使用方法:
#   1. 设置环境变量（可选）:
#      export DEPLOY_HOST=root@www.godtrending.com
#      export DEPLOY_DIR=/workspace/good-trending
#
#   2. 执行部署:
#      ./scripts/deploy.sh
#

set -e

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
# 配置（可通过环境变量覆盖）
# ============================================
DEPLOY_HOST="${DEPLOY_HOST:-root@www.godtrending.com}"
DEPLOY_DIR="${DEPLOY_DIR:-/workspace/good-trending}"
SERVICES="api web scheduler"

log_info "=========================================="
log_info "Good-Trending 自动部署脚本"
log_info "=========================================="
log_info "部署目标: $DEPLOY_HOST:$DEPLOY_DIR"
log_info "=========================================="
echo ""

# ============================================
# 1. 安装依赖
# ============================================
log_info "[1/6] 安装依赖..."
pnpm install --frozen-lockfile
log_success "依赖安装完成"

# ============================================
# 2. 构建服务
# ============================================
log_info "[2/6] 构建服务 (api, web, scheduler)..."
pnpm run build:deploy
log_success "构建完成"

# ============================================
# 3. 检查构建结果
# ============================================
log_info "[3/6] 检查构建结果..."
for service in $SERVICES; do
    if [ ! -d "apps/$service/dist" ] && [ ! -d "apps/$service/.next" ]; then
        log_error "构建失败: apps/$service 没有输出目录"
        exit 1
    fi
    log_success "  ✓ $service 构建完成"
done

# ============================================
# 4. 创建部署包（包含所有文件）
# ============================================
log_info "[4/6] 创建部署包..."
DEPLOY_PACKAGE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# 打包所有必要文件（包括中间文件和配置）
tar -czf $DEPLOY_PACKAGE \
    apps/api/dist \
    apps/api/package.json \
    apps/web/.next \
    apps/web/public \
    apps/web/package.json \
    apps/scheduler/dist \
    apps/scheduler/package.json \
    deploy/.env.production \
    deploy/ecosystem.config.js \
    deploy/nginx \
    deploy/init-database.sh \
    deploy/DATABASE-MAINTENANCE.md \
    deploy/POSTGRESQL-TROUBLESHOOTING.md \
    package.json \
    pnpm-workspace.yaml \
    pnpm-lock.yaml \
    turbo.json \
    scripts/start-all.sh \
    scripts/check-status.ts \
    scripts/check-data.mjs \
    scripts/check-db-stats.mjs \
    --exclude='node_modules' \
    --exclude='.git' 2>/dev/null || true

log_success "部署包创建完成: $DEPLOY_PACKAGE ($(du -h $DEPLOY_PACKAGE | cut -f1))"

# ============================================
# 5. 上传到服务器
# ============================================
log_info "[5/6] 上传部署包到服务器..."

# 创建远程目录
ssh $DEPLOY_HOST "mkdir -p $DEPLOY_DIR"

# 上传部署包
scp $DEPLOY_PACKAGE $DEPLOY_HOST:/tmp/

# 解压到部署目录
ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR
    echo '解压部署包...'
    tar -xzf /tmp/$DEPLOY_PACKAGE --strip-components=0
    rm /tmp/$DEPLOY_PACKAGE

    # 创建必要的目录
    mkdir -p app/api/logs app/web/logs app/scheduler/logs
    mkdir -p deploy/app

    # 复制 ecosystem.config.js 到部署目录
    cp deploy/ecosystem.config.js .

    echo '文件结构:'
    ls -la
"

# 清理本地部署包
rm -f $DEPLOY_PACKAGE

log_success "文件上传完成"

# ============================================
# 6. 服务器端安装依赖并配置
# ============================================
log_info "[6/6] 在服务器上安装依赖并启动服务..."

ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR

    echo '安装生产依赖（使用 npm）...'
    # 为每个服务安装生产依赖
    for service in api web scheduler; do
        echo \"安装 apps/\$service 依赖...\"
        cd apps/\$service
        npm install --production
        cd ../..
    done
    echo '依赖安装完成'

    echo ''
    echo '=========================================='
    echo '环境变量配置示例:'
    echo '=========================================='
    echo '请执行以下命令配置环境变量:'
    echo ''
    echo '  export DATABASE_URL=postgresql://user:password@localhost:5432/good_trending'
    echo '  export REDIS_URL=redis://localhost:6379'
    echo '  export NEXT_PUBLIC_API_URL=/backend/api/v1'
    echo ''
    echo '或复制配置文件:'
    echo "  cp deploy/.env.production .env"
    echo '=========================================='
    echo ''

    # 检查 PM2 是否安装
    if ! command -v pm2 &> /dev/null; then
        echo '安装 PM2...'
        npm install -g pm2
    fi

    # 启动/重启服务
    echo '启动服务...'
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

    # 保存 PM2 配置
    pm2 save

    echo ''
    echo '服务状态:'
    pm2 status
"

log_success "部署完成"

# ============================================
# 7. 验证部署
# ============================================
echo ""
log_info "=========================================="
log_info "部署摘要"
log_info "=========================================="
echo ""
echo "部署目录: $DEPLOY_DIR"
echo ""
echo "下一步操作:"
echo ""
echo "1. SSH 登录服务器配置环境变量:"
echo "   ssh $DEPLOY_HOST"
echo "   cd $DEPLOY_DIR"
echo "   cp deploy/.env.production .env"
echo "   nano .env  # 编辑数据库连接等配置"
echo ""
echo "2. 重启服务应用配置:"
echo "   pm2 restart all"
echo ""
echo "3. 查看服务状态:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "4. 测试访问:"
echo "   curl http://www.godtrending.com/health"
echo ""
echo "=========================================="
