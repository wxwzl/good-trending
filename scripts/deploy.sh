#!/bin/bash
#
# Good-Trending 自动部署脚本
# 构建并部署 api, web, scheduler 服务
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

# 配置
DEPLOY_HOST="${DEPLOY_HOST:-root@www.godtrending.com}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/good-trending}"
SERVICES="api web scheduler"

log_info "开始部署 Good-Trending..."
log_info "部署目标: $DEPLOY_HOST:$DEPLOY_DIR"

# ============================================
# 1. 安装依赖
# ============================================
log_info "安装依赖..."
pnpm install --frozen-lockfile

# ============================================
# 2. 构建服务
# ============================================
log_info "构建服务 (api, web, scheduler)..."
pnpm run build:deploy

# ============================================
# 3. 检查构建结果
# ============================================
log_info "检查构建结果..."
for service in $SERVICES; do
    if [ ! -d "apps/$service/dist" ] && [ ! -d "apps/$service/.next" ]; then
        log_error "构建失败: apps/$service 没有输出目录"
        exit 1
    fi
    log_success "$service 构建完成"
done

# ============================================
# 4. 上传部署文件
# ============================================
log_info "上传部署文件到服务器..."

# 创建部署包
DEPLOY_PACKAGE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf $DEPLOY_PACKAGE \
    apps/api/dist \
    apps/api/package.json \
    apps/web/.next \
    apps/web/public \
    apps/web/package.json \
    apps/scheduler/dist \
    apps/scheduler/package.json \
    deploy/.env.production \
    deploy/nginx \
    package.json \
    pnpm-workspace.yaml \
    --exclude='node_modules' \
    --exclude='.git' 2>/dev/null || true

# 上传到服务器
scp $DEPLOY_PACKAGE $DEPLOY_HOST:/tmp/

# 解压到部署目录
ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR
    tar -xzf /tmp/$DEPLOY_PACKAGE --strip-components=0
    rm /tmp/$DEPLOY_PACKAGE
"

# 清理本地部署包
rm -f $DEPLOY_PACKAGE

log_success "文件上传完成"

# ============================================
# 5. 服务器端安装依赖并重启
# ============================================
log_info "在服务器上安装依赖并重启服务..."

ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR

    # 安装生产依赖
    pnpm install --production --frozen-lockfile

    # 重启服务
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

    # 保存 PM2 配置
    pm2 save
"

log_success "服务重启完成"

# ============================================
# 6. 验证部署
# ============================================
log_info "验证部署状态..."
sleep 3

# 检查服务状态
ssh $DEPLOY_HOST "pm2 status"

# 测试接口
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://www.godtrending.com/health || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    log_success "部署成功！服务运行正常"
else
    log_warn "HTTP 状态码: $HTTP_STATUS，请检查服务状态"
fi

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  Web:    http://www.godtrending.com"
echo "  API:    http://www.godtrending.com/backend/api"
echo "  Health: http://www.godtrending.com/health"
echo ""
