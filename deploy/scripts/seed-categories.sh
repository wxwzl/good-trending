#!/bin/bash
#
# 类目初始化脚本
# 从 categoryKeys.json 导入类目数据到数据库
#
# 使用方法:
#   ./deploy/scripts/seed-categories.sh
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
# 写死的数据库连接地址（使用 127.0.0.1 而不是 localhost）
DATABASE_URL="postgresql://trending:trending-god@127.0.0.1:5432/good_trending"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# categoryKeys.json 文件路径
CATEGORY_FILE="${DEPLOY_DIR}/category/categoryKeys.json"

log_info "=========================================="
log_info "类目数据初始化脚本"
log_info "=========================================="
log_info "数据库: postgresql://trending:***@127.0.0.1:5432/good_trending"
log_info "数据文件: ${CATEGORY_FILE}"
log_info "=========================================="
echo ""

# ============================================
# 检查依赖
# ============================================
if ! command -v psql &> /dev/null; then
    log_error "未安装 psql 命令"
    exit 1
fi

if [ ! -f "$CATEGORY_FILE" ]; then
    log_error "找不到 categoryKeys.json 文件: ${CATEGORY_FILE}"
    exit 1
fi

# ============================================
# 检查数据库连接
# ============================================
log_info "检查数据库连接..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "无法连接到数据库"
    log_error "请检查:"
    log_error "  1. PostgreSQL 是否已启动: sudo systemctl status postgresql"
    log_error "  2. 数据库连接配置是否正确"
    log_error "  3. 用户和密码是否正确"
    log_error ""
    log_error "当前连接字符串: postgresql://trending:***@127.0.0.1:5432/good_trending"
    exit 1
fi
log_success "数据库连接正常"
echo ""

# ============================================
# 检查表是否存在
# ============================================
log_info "检查 category 表是否存在..."
if ! psql "$DATABASE_URL" -c "SELECT 1 FROM category LIMIT 1;" > /dev/null 2>&1; then
    log_error "category 表不存在"
    log_error "请先运行数据库迁移创建表结构"
    exit 1
fi
log_success "category 表存在"
echo ""

# ============================================
# 生成 slug
# ============================================
generate_slug() {
    local name="$1"
    # 转小写
    local slug=$(echo "$name" | tr '[:upper:]' '[:lower:]')
    # 将空格、逗号、& 等特殊字符替换为 -
    slug=$(echo "$slug" | sed 's/[,\&]/ /g')
    slug=$(echo "$slug" | sed 's/\s/-/g')
    # 移除连续的 -
    slug=$(echo "$slug" | sed 's/-\+/-/g')
    # 移除开头和结尾的 -
    slug=$(echo "$slug" | sed 's/^-//;s/-$//')
    # 截取前 100 个字符
    slug="${slug:0:100}"
    echo "$slug"
}

# ============================================
# 生成 CUID
# ============================================
generate_cuid() {
    openssl rand -hex 16
}

# ============================================
# 检查类目是否存在
# ============================================
category_exists() {
    local slug="$1"
    local result
    result=$(psql "$DATABASE_URL" -t -A -c "SELECT COUNT(*) FROM category WHERE slug = '$slug';" 2>/dev/null)

    # 检查结果是否为数字
    if ! [[ "$result" =~ ^[0-9]+$ ]]; then
        echo "0"
        return 1
    fi

    if [ "$result" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# ============================================
# 创建类目
# ============================================
create_category() {
    local name="$1"
    local slug="$2"
    local id=$(generate_cuid)
    local description="Amazon category: $name"

    # 转义单引号
    local escaped_name="${name//'/''}"
    local escaped_description="${description//'/''}"

    if psql "$DATABASE_URL" -c "
        INSERT INTO category (id, name, slug, description, search_keywords, created_at, updated_at)
        VALUES ('$id', '$escaped_name', '$slug', '$escaped_description', '$escaped_name', NOW(), NOW());
    " > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# ============================================
# 主逻辑
# ============================================
log_info "🌱 开始初始化类目数据..."
echo ""

# 解析 JSON 文件，提取类目名称
log_info "📂 正在读取 categoryKeys.json..."

# 读取类目列表
mapfile -t category_names < <(grep -o '"[^"]*"' "$CATEGORY_FILE" | tr -d '"' | grep -v '^$')

log_info "📂 从 categoryKeys.json 加载了 ${#category_names[@]} 个类目"
echo ""

created_count=0
existing_count=0
failed_count=0

for name in "${category_names[@]}"; do
    # 跳过空行
    [ -z "$name" ] && continue

    slug=$(generate_slug "$name")

    # 检查是否已存在
    if category_exists "$slug"; then
        log_warn "  ⏭️  跳过已存在: $name"
        ((existing_count++))
        continue
    fi

    # 创建新类目
    if create_category "$name" "$slug"; then
        log_success "  ✓ 创建类目: $name"
        ((created_count++))
    else
        log_error "  ❌ 创建失败: $name"
        ((failed_count++))
    fi
done

echo ""
log_info "📊 初始化结果:"
echo "  创建成功: $created_count"
echo "  已存在跳过: $existing_count"
echo "  创建失败: $failed_count"
echo ""

if [ $failed_count -eq 0 ]; then
    log_success "✅ 类目数据初始化完成!"
else
    log_error "⚠️ 部分类目初始化失败"
    exit 1
fi
