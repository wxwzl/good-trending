#!/bin/bash
#
# Good-Trending 自动部署脚本
# 构建应用、生成数据库迁移、部署到服务器
#
# 使用方法: ./scripts/deploy.sh
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
# 配置（硬编码）
# ============================================
DEPLOY_HOST="root@www.godtrending.com"
DEPLOY_DIR="/workspace/good-trending"
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
log_info "[1/7] 安装依赖..."
pnpm install --frozen-lockfile
log_success "依赖安装完成"

# ============================================
# 2. 构建服务
# ============================================
log_info "[2/7] 构建服务 (api, web, scheduler)..."
pnpm run build:deploy
log_success "构建完成"

# ============================================
# 3. 检查构建结果
# ============================================
log_info "[3/7] 检查构建结果..."
for service in $SERVICES; do
    if [ ! -d "apps/$service/dist" ] && [ ! -d "apps/$service/.next" ]; then
        log_error "构建失败: apps/$service 没有输出目录"
        exit 1
    fi
    log_success "  ✓ $service 构建完成"
done

# ============================================
# 4. 生成数据库迁移
# ============================================
echo ""
log_info "[4/7] 数据库迁移"
echo "是否需要生成新的数据库迁移?"
echo "  1) 是 - 执行 db:generate 生成 SQL"
echo "  2) 否 - 使用已存在的迁移文件"
read -p "选择 (1/2): " migrate_choice

GENERATED_SQL=""
if [ "$migrate_choice" = "1" ]; then
    log_info "生成数据库迁移..."
    cd packages/database
    pnpm run db:generate
    cd ../..

    # 找出新生成的 SQL 文件
    NEW_SQL=$(find packages/database/migrations -name "*.sql" -type f -mmin -5 | head -1)
    if [ -n "$NEW_SQL" ]; then
        GENERATED_SQL="$NEW_SQL"
        SQL_FILENAME=$(basename "$NEW_SQL")
        log_success "生成迁移文件: $SQL_FILENAME"

        # 复制到部署目录
        cp "$NEW_SQL" "deploy/migrations/"
        log_info "已复制到 deploy/migrations/$SQL_FILENAME"
    else
        log_warn "未检测到新生成的 SQL 文件"
    fi
else
    log_info "跳过迁移生成，使用现有文件"
fi

# ============================================
# 5. 创建部署包
# ============================================
log_info "[5/7] 创建部署包..."
DEPLOY_PACKAGE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# 创建部署目录结构
mkdir -p deploy/migrations

# 打包所有必要文件
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
    deploy/migrations \
    deploy/scripts \
    deploy/init-database.sh \
    deploy/install-ubuntu.sh \
    deploy/install-ubuntu-remaining.sh \
    deploy/DATABASE-DEPLOY.md \
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
# 6. 上传到服务器
# ============================================
log_info "[6/7] 上传部署包到服务器..."

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

    echo '文件解压完成'
"

# 清理本地部署包
rm -f $DEPLOY_PACKAGE

log_success "文件上传完成"

# ============================================
# 7. 在服务器上执行数据库迁移
# ============================================
echo ""
log_info "[7/7] 在服务器上执行数据库迁移..."

ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR

    # 检查 DATABASE_URL
    if [ -z \"\$DATABASE_URL\" ]; then
        echo '错误: 未设置 DATABASE_URL 环境变量'
        echo '请先执行: export DATABASE_URL=postgresql://user:password@localhost:5432/good_trending'
        exit 1
    fi

    # 检查是否有迁移文件
    if [ -d \"deploy/migrations\" ] && [ \"\$(ls -A deploy/migrations/*.sql 2>/dev/null)\" ]; then
        echo '发现迁移文件，执行中...'
        chmod +x deploy/scripts/run-migrations.sh
        ./deploy/scripts/run-migrations.sh
    else
        echo '没有需要执行的迁移文件'
    fi
"

if [ $? -ne 0 ]; then
    log_error "数据库迁移失败"
    exit 1
fi

log_success "数据库迁移完成"

# ============================================
# 8. 服务器端安装应用依赖并启动
# ============================================
echo ""
log_info "安装应用依赖并启动服务..."

ssh $DEPLOY_HOST "
    cd $DEPLOY_DIR

    echo '安装生产依赖（使用 npm）...'
    for service in api web scheduler; do
        echo \"  安装 apps/\$service...\"
        cd apps/\$service
        npm install --production
        cd ../..
    done
    echo '依赖安装完成'

    echo ''
    echo '=========================================='
    echo '环境变量配置:'
    echo '=========================================='
    echo '请确保已设置以下环境变量:'
    echo ''
    echo '  export DATABASE_URL=postgresql://user:password@localhost:5432/good_trending'
    echo '  export REDIS_URL=redis://localhost:6379'
    echo '  export NEXT_PUBLIC_API_URL=/backend/api/v1'
    echo '  export CORS_ORIGINS=http://www.godtrending.com'
    echo ''
    echo '或创建 .env 文件:'
    echo '  cp deploy/.env.production .env'
    echo '=========================================='
    echo ''

    # 检查 PM2
    if ! command -v pm2 &>/dev/null; then
        echo '安装 PM2...'
        npm install -g pm2
    fi

    # 启动服务
    echo '启动服务...'
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save

    echo ''
    echo '服务状态:'
    pm2 status
"

# ============================================
# 9. 提交迁移文件到代码库
# ============================================
echo ""
if [ -n "$GENERATED_SQL" ]; then
    log_info "提交迁移文件到代码库..."
    SQL_FILENAME=$(basename "$GENERATED_SQL")

    git add packages/database/migrations/
    git add deploy/migrations/
    git status

    echo ""
    read -p "提交迁移文件? (y/N): " commit_confirm
    if [ "$commit_confirm" = "y" ] || [ "$commit_confirm" = "Y" ]; then
        git commit -m "chore(db): add migration $SQL_FILENAME" --no-verify
        log_success "迁移文件已提交"
        echo "请手动推送: git push"
    else
        log_warn "未提交，请手动提交"
    fi
fi

# ============================================
# 10. 完成
# ============================================
echo ""
log_success "=========================================="
log_success "部署完成!"
log_success "=========================================="
echo ""
echo "访问地址:"
echo "  http://www.godtrending.com"
echo "  http://www.godtrending.com/backend/api/health"
echo ""
echo "查看日志:"
echo "  ssh $DEPLOY_HOST"
echo "  cd $DEPLOY_DIR"
echo "  pm2 logs"
echo ""
echo "=========================================="
