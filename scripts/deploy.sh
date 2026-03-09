#!/bin/bash
#
# Good-Trending 部署包生成和上传脚本
# 只负责打包和上传，不执行服务器端命令
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

# ============================================
# 提示输入密码
# ============================================
echo ""
log_info "=========================================="
log_info "Good-Trending 部署包生成和上传"
log_info "=========================================="
log_info "部署目标: $DEPLOY_HOST:$DEPLOY_DIR"
log_info "=========================================="
echo ""

# 检查是否使用密码或 SSH Key
echo "连接方式:"
echo "  1) 使用 SSH Key（免密码，推荐）"
echo "  2) 使用密码（将提示输入）"
read -p "选择 (1/2): " auth_choice

SSH_PASS=""
USE_SSHPASS=false

if [ "$auth_choice" = "2" ]; then
    # 检查是否安装了 sshpass
    if command -v sshpass &> /dev/null; then
        read -s -p "请输入服务器密码: " SSH_PASS
        echo ""
        USE_SSHPASS=true
        log_info "将使用 sshpass 自动输入密码"
    else
        log_warn "未安装 sshpass，每次连接都将手动输入密码"
        log_info "建议安装: apt-get install sshpass 或 brew install sshpass"
        echo ""
    fi
fi

echo ""

# ============================================
# 1. 安装依赖
# ============================================
log_info "[1/5] 安装依赖..."
pnpm install --frozen-lockfile
log_success "依赖安装完成"

# ============================================
# 2. 构建服务
# ============================================
log_info "[2/5] 构建服务 (api, web, scheduler)..."
pnpm run build:deploy
log_success "应用构建完成"

# 构建 crawler 脚本
log_info "构建 crawler 30天数据爬取脚本..."
cd apps/crawler
pnpm run build:script
cd ../..
log_success "Crawler 脚本构建完成"

# ============================================
# 3. 检查构建结果
# ============================================
log_info "[3/5] 检查构建结果..."
for service in $SERVICES; do
    if [ ! -d "apps/$service/dist" ] && [ ! -d "apps/$service/.next" ]; then
        log_error "构建失败: apps/$service 没有输出目录"
        exit 1
    fi
    log_success "  ✓ $service 构建完成"
done

# ============================================
# 4. 生成数据库迁移（可选）
# ============================================
echo ""
log_info "[4/5] 数据库迁移"
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
        mkdir -p deploy/migrations
        cp "$NEW_SQL" "deploy/migrations/"
        log_info "已复制到 deploy/migrations/$SQL_FILENAME"
    else
        log_warn "未检测到新生成的 SQL 文件"
    fi
else
    log_info "跳过迁移生成"
fi

# ============================================
# 5. 创建部署包
# ============================================
log_info "[5/5] 创建部署包..."
DEPLOY_PACKAGE="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

# 确保 migrations 目录存在
mkdir -p deploy/migrations

# 打包所有必要文件
tar -czf $DEPLOY_PACKAGE \
    deploy/app/api/dist \
    deploy/app/api/package.json \
    deploy/app/web/.next \
    deploy/app/web/public \
    deploy/app/web/package.json \
    deploy/app/scheduler/dist \
    deploy/app/scheduler/package.json \
    deploy/.env.production \
    deploy/ecosystem.config.js \
    deploy/nginx \
    deploy/app/crawler/run-crawl-30days.sh \
    deploy/migrations \
    deploy/scripts \
    deploy/init-database.sh \
    deploy/scripts/start-services.sh \
    deploy/install-ubuntu.sh \
    deploy/install-ubuntu-remaining.sh \
    --exclude='node_modules' \
    --exclude='.git' 2>/dev/null || true

log_success "部署包创建完成: $DEPLOY_PACKAGE ($(du -h $DEPLOY_PACKAGE | cut -f1))"

# ============================================
# 6. 上传到服务器
# ============================================
log_info "上传部署包到服务器..."

# 创建远程目录
if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$SSH_PASS" ssh $DEPLOY_HOST "mkdir -p $DEPLOY_DIR"
else
    ssh $DEPLOY_HOST "mkdir -p $DEPLOY_DIR"
fi

# 上传部署包
if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$SSH_PASS" scp $DEPLOY_PACKAGE "$DEPLOY_HOST:$DEPLOY_DIR/"
else
    scp $DEPLOY_PACKAGE "$DEPLOY_HOST:$DEPLOY_DIR/"
fi

# 解压部署包
if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$SSH_PASS" ssh $DEPLOY_HOST "
        cd $DEPLOY_DIR
        echo '解压部署包...'
        tar -xzf $DEPLOY_PACKAGE
        rm $DEPLOY_PACKAGE
        echo '解压完成'
    "
else
    ssh $DEPLOY_HOST "
        cd $DEPLOY_DIR
        echo '解压部署包...'
        tar -xzf $DEPLOY_PACKAGE
        rm $DEPLOY_PACKAGE
        echo '解压完成'
    "
fi

# 清理本地部署包
rm -f $DEPLOY_PACKAGE

log_success "部署包上传完成"

# ============================================
# 7. 提交迁移文件（如果有）
# ============================================
if [ -n "$GENERATED_SQL" ]; then
    echo ""
    log_info "提交迁移文件到代码库..."
    SQL_FILENAME=$(basename "$GENERATED_SQL")

    git add packages/database/migrations/
    git add deploy/migrations/

    echo ""
    read -p "提交迁移文件? (y/N): " commit_confirm
    if [ "$commit_confirm" = "y" ] || [ "$commit_confirm" = "Y" ]; then
        git commit -m "chore(db): add migration $SQL_FILENAME" --no-verify
        log_success "迁移文件已提交，请手动推送: git push"
    else
        log_warn "未提交，请手动提交:"
        echo "  git add packages/database/migrations/ deploy/migrations/"
        echo "  git commit -m 'chore(db): add migration'"
    fi
fi

# ============================================
# 8. 完成提示
# ============================================
echo ""
log_success "=========================================="
log_success "部署包上传完成!"
log_success "=========================================="
echo ""
echo "部署目录: $DEPLOY_DIR"
echo ""
echo "请在服务器上执行以下操作:"
echo ""
echo "1. SSH 登录服务器:"
if [ "$USE_SSHPASS" = true ]; then
    echo "   sshpass -p '你的密码' ssh $DEPLOY_HOST"
else
    echo "   ssh $DEPLOY_HOST"
fi
echo ""
echo "2. 进入部署目录:"
echo "   cd $DEPLOY_DIR"
echo ""
echo "3. 执行数据库迁移（如有新的 SQL 文件）:"
echo "   ./deploy/scripts/run-migrations.sh"
echo ""
echo "4. 安装依赖并启动服务:"
echo "   ./deploy/scripts/start-services.sh"
echo ""
echo "或手动执行:"
echo "   cd apps/api && npm install --production && cd ../.."
echo "   cd apps/web && npm install --production && cd ../.."
echo "   cd apps/scheduler && npm install --production && cd ../.."
echo "   pm2 start ecosystem.config.js && pm2 save"
echo ""
echo "注意: 环境变量已配置在 deploy/.env.production，程序会自动加载"
echo "=========================================="
