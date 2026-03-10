#!/bin/bash
#
# 数据库连接检查和修复脚本
#

set -e

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

# 默认使用 postgres 用户
DEFAULT_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
GOOD_TRENDING_URL="postgresql://postgres:postgres@127.0.0.1:5432/good_trending"

echo "=========================================="
echo "  数据库连接检查和修复"
echo "=========================================="
echo ""

# 检查 PostgreSQL 是否运行
log_info "检查 PostgreSQL 服务状态..."
if ! pg_isready -h 127.0.0.1 -p 5432 > /dev/null 2>&1; then
    log_error "PostgreSQL 未运行"
    log_info "请启动 PostgreSQL:"
    echo "  sudo systemctl start postgresql"
    exit 1
fi
log_success "PostgreSQL 正在运行"
echo ""

# 测试默认连接
log_info "测试使用 postgres 用户连接..."
if psql "$DEFAULT_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "连接成功 (用户: postgres, 数据库: postgres)"
    CAN_CONNECT=true
else
    log_error "无法连接到 PostgreSQL"
    log_info "请检查密码是否正确"
    CAN_CONNECT=false
fi
echo ""

if [ "$CAN_CONNECT" = true ]; then
    # 检查数据库是否存在
    log_info "检查 good_trending 数据库是否存在..."
    if psql "$DEFAULT_URL" -t -c "SELECT 1 FROM pg_database WHERE datname = 'good_trending';" | grep -q 1; then
        log_success "数据库 good_trending 已存在"
    else
        log_warn "数据库 good_trending 不存在"
        log_info "创建数据库..."
        psql "$DEFAULT_URL" -c "CREATE DATABASE good_trending;"
        log_success "数据库创建成功"
    fi
    echo ""

    # 检查 trending 用户是否存在
    log_info "检查 trending 用户是否存在..."
    if psql "$DEFAULT_URL" -t -c "SELECT 1 FROM pg_roles WHERE rolname = 'trending';" | grep -q 1; then
        log_success "用户 trending 已存在"
    else
        log_warn "用户 trending 不存在"
        log_info "创建用户..."
        psql "$DEFAULT_URL" -c "CREATE USER trending WITH PASSWORD 'trending-god';"
        psql "$DEFAULT_URL" -c "GRANT ALL PRIVILEGES ON DATABASE good_trending TO trending;"
        psql "$GOOD_TRENDING_URL" -c "GRANT ALL ON SCHEMA public TO trending;"
        psql "$GOOD_TRENDING_URL" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO trending;"
        log_success "用户创建成功"
    fi
    echo ""

    # 测试 trending 用户连接
    log_info "测试使用 trending 用户连接..."
    TEST_URL="postgresql://trending:trending-god@127.0.0.1:5432/good_trending"
    if psql "$TEST_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "trending 用户连接成功"
    else
        log_error "trending 用户连接失败"
        log_info "可能原因:"
        log_info "  1. 密码不正确"
        log_info "  2. pg_hba.conf 配置不允许本地密码认证"
        log_info ""
        log_info "修复方法:"
        log_info "  sudo -u postgres psql -c \"ALTER USER trending WITH PASSWORD 'trending-god';\""
    fi
    echo ""

    # 检查表是否存在
    log_info "检查 categories 表是否存在..."
    if psql "$GOOD_TRENDING_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'categories';" | grep -q 1; then
        log_success "表 categories 已存在"
    else
        log_warn "表 categories 不存在"
        log_info "请先运行数据库迁移"
    fi
    echo ""
fi

echo "=========================================="
echo "  检查完成"
echo "=========================================="
