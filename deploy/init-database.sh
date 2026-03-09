#!/bin/bash
#
# Good-Trending 数据库初始化脚本
# 创建数据库、用户和初始化表结构
#
# 使用方法:
# 1. chmod +x init-database.sh
# 2. sudo -u postgres ./init-database.sh
#
# 指定环境变量（可选）：
# 方式1 - 命令行临时指定：
#   sudo -u postgres DB_PASSWORD=trending-god DB_USER=trending ./init-database.sh
#
# 方式2 - 先导出再执行：
#   export DB_PASSWORD=my_pass DB_USER=myuser
#   sudo -u postgres ./init-database.sh
#
# 支持的变量：DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
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

# 默认配置（可以通过环境变量覆盖）
DB_NAME="${DB_NAME:-good_trending}"
DB_USER="${DB_USER:-good_trending}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32 | tr -d '=+/')}"  # 随机生成强密码
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

log_info "数据库初始化配置:"
echo "  数据库名: $DB_NAME"
echo "  用户名: $DB_USER"
echo "  主机: $DB_HOST:$DB_PORT"

# ============================================
# 1. 检查 PostgreSQL 是否运行
# ============================================
log_info "检查 PostgreSQL 服务状态..."
if ! pg_isready -q; then
    log_error "PostgreSQL 未运行，请先启动服务: sudo systemctl start postgresql"
    exit 1
fi
log_success "PostgreSQL 运行正常"

# ============================================
# 2. 创建数据库用户
# ============================================
log_info "创建数据库用户: $DB_USER"

if psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    log_warn "用户 $DB_USER 已存在，跳过创建"
else
    psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    log_success "用户 $DB_USER 创建成功"
fi

# ============================================
# 3. 创建数据库
# ============================================
log_info "创建数据库: $DB_NAME"

if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_warn "数据库 $DB_NAME 已存在，跳过创建"
else
    psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;"
    log_success "数据库 $DB_NAME 创建成功"
fi

# ============================================
# 4. 配置权限
# ============================================
log_info "配置数据库权限..."

psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"

log_success "权限配置完成"

# ============================================
# 5. 配置 PostgreSQL 允许远程连接（可选）
# ============================================
log_info "配置 PostgreSQL 监听..."

PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
PG_CONF="/etc/postgresql/16/main/postgresql.conf"

# 检查是否已经配置
if ! grep -q "good-trending-config" "$PG_HBA" 2>/dev/null; then
    log_info "配置 pg_hba.conf..."

    # 备份原文件
    cp "$PG_HBA" "${PG_HBA}.backup.$(date +%Y%m%d%H%M%S)"

    # 添加本地信任连接（用于本地开发）
    cat >> "$PG_HBA" << EOF

# good-trending-config - Good-Trending 应用配置
local   $DB_NAME    $DB_USER                    md5
host    $DB_NAME    $DB_USER    127.0.0.1/32   md5
host    $DB_NAME    $DB_USER    ::1/128        md5
EOF

    # 修改监听地址
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONF"

    # 重启 PostgreSQL
    systemctl restart postgresql
    log_success "PostgreSQL 配置已更新并重启"
else
    log_warn "PostgreSQL 已配置，跳过"
fi

# ============================================
# 6. 生成连接字符串
# ============================================
log_info "生成数据库连接字符串..."

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

echo ""
echo "=========================================="
echo "  数据库初始化完成！"
echo "=========================================="
echo ""
echo "连接信息:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "DATABASE_URL:"
echo "  $DATABASE_URL"
echo ""
echo "=========================================="
echo ""
echo "请将 DATABASE_URL 添加到环境变量中:"
echo "  export DATABASE_URL='$DATABASE_URL'"
echo ""
echo "或者添加到 .env 文件:"
echo "  DATABASE_URL=$DATABASE_URL"
echo ""
echo "=========================================="

# 保存连接字符串到文件（方便复制）
ENV_FILE="/opt/good-trending/.env.database"
if [ -d "/opt/good-trending" ]; then
    echo "DATABASE_URL=$DATABASE_URL" > "$ENV_FILE"
    echo "DB_HOST=$DB_HOST" >> "$ENV_FILE"
    echo "DB_PORT=$DB_PORT" >> "$ENV_FILE"
    echo "DB_NAME=$DB_NAME" >> "$ENV_FILE"
    echo "DB_USER=$DB_USER" >> "$ENV_FILE"
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$ENV_FILE"
    log_success "连接信息已保存到: $ENV_FILE"
fi

# 测试连接
log_info "测试数据库连接..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    log_success "数据库连接测试成功！"
else
    log_warn "数据库连接测试失败，请检查配置"
fi
