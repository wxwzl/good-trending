#!/bin/bash
#
# 服务器端数据库迁移执行脚本
# 在服务器上执行 deploy/migrations/ 目录下的所有 SQL 文件
#
# 使用方法:
#   cd /workspace/good-trending
#   ./deploy/scripts/run-migrations.sh
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
# 配置
# ============================================
MIGRATIONS_DIR="${1:-deploy/migrations}"

# 写死的数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/good_trending"

log_info "=========================================="
log_info "数据库迁移执行脚本"
log_info "=========================================="
log_info "迁移目录: $MIGRATIONS_DIR"
log_info "数据库: postgresql://postgres:***@localhost:5432/good_trending"
log_info "=========================================="
echo ""

# ============================================
# 检查迁移目录
# ============================================
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "迁移目录不存在: $MIGRATIONS_DIR"
    exit 1
fi

# 获取所有 SQL 文件
SQL_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort)

if [ -z "$SQL_FILES" ]; then
    log_warn "没有找到 SQL 迁移文件"
    exit 0
fi

log_info "发现 $(echo "$SQL_FILES" | wc -l) 个迁移文件:"
echo "$SQL_FILES" | while read file; do
    echo "  - $(basename $file)"
done
echo ""

# ============================================
# 确认执行
# ============================================
read -p "确认执行这些迁移? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    log_warn "已取消"
    exit 0
fi

echo ""
log_info "开始执行迁移..."
echo ""

# ============================================
# 执行迁移
# ============================================
SUCCESS_COUNT=0
FAILED_COUNT=0

for sql_file in $SQL_FILES; do
    filename=$(basename "$sql_file")
    log_info "执行: $filename"

    if psql "$DATABASE_URL" -f "$sql_file" > /dev/null 2>&1; then
        log_success "  ✓ 成功"
        ((SUCCESS_COUNT++))
    else
        log_error "  ✗ 失败"
        ((FAILED_COUNT++))
    fi
done

echo ""
log_success "=========================================="
log_success "迁移执行完成"
log_success "=========================================="
echo ""
echo "统计:"
echo "  成功: $SUCCESS_COUNT"
echo "  失败: $FAILED_COUNT"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    exit 1
fi

# ============================================
# 验证数据库
# ============================================
log_info "验证数据库连接..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    log_success "数据库连接正常"
else
    log_error "数据库连接失败"
    exit 1
fi

echo ""
log_success "全部完成!"
