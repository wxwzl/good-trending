#!/bin/bash
#
# Good-Trending 服务启动脚本
# 一键启动所有服务（使用 PM2）
#
# 使用方法:
# 1. chmod +x start-all.sh
# 2. ./start-all.sh
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

# 部署目录（默认为当前目录）
DEPLOY_DIR="${DEPLOY_DIR:-$(pwd)}"
APP_DIR="$DEPLOY_DIR/app"

# ============================================
# 检查部署目录
# ============================================
if [ ! -d "$DEPLOY_DIR" ]; then
    log_error "部署目录不存在: $DEPLOY_DIR"
    log_info "请先运行 install-ubuntu.sh 或直接创建目录"
    exit 1
fi

log_info "部署目录: $DEPLOY_DIR"

# ============================================
# 检查环境变量文件
# ============================================
log_info "检查环境变量配置..."

if [ ! -f "$DEPLOY_DIR/.env" ] && [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    log_warn "未找到环境变量文件"
    log_info "请创建环境变量文件:"
    log_info "  cp /path/to/.env.production $DEPLOY_DIR/.env"

    # 询问是否继续
    read -p "是否继续? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ============================================
# 检查服务目录
# ============================================
services=("api" "web" "scheduler")
missing_services=()

for service in "${services[@]}"; do
    if [ ! -d "$APP_DIR/$service" ]; then
        missing_services+=("$service")
    fi
done

if [ ${#missing_services[@]} -ne 0 ]; then
    log_error "以下服务目录不存在: ${missing_services[*]}"
    log_info "请先上传部署包到 $APP_DIR/"
    exit 1
fi

log_success "所有服务目录已就绪"

# ============================================
# 安装依赖
# ============================================
log_info "检查并安装服务依赖..."

for service in "${services[@]}"; do
    service_dir="$APP_DIR/$service"

    if [ ! -d "$service_dir/node_modules" ]; then
        log_info "安装 $service 依赖..."
        cd "$service_dir"

        if [ -f "package.json" ]; then
            # 使用 pnpm 或 npm 安装生产依赖
            if command -v pnpm &> /dev/null; then
                pnpm install --production
            else
                npm install --production
            fi
            log_success "$service 依赖安装完成"
        else
            log_warn "$service 缺少 package.json，跳过"
        fi
    else
        log_info "$service 依赖已安装"
    fi
done

# ============================================
# 检查数据库连接
# ============================================
log_info "检查数据库连接..."

# 从环境变量读取数据库配置
if [ -f "$DEPLOY_DIR/.env" ]; then
    export $(grep -v '^#' "$DEPLOY_DIR/.env" | xargs)
elif [ -f "$DEPLOY_DIR/.env.production" ]; then
    export $(grep -v '^#' "$DEPLOY_DIR/.env.production" | xargs)
fi

if [ -n "$DATABASE_URL" ]; then
    # 解析连接字符串
    if command -v pg_isready &> /dev/null; then
        if pg_isready -q; then
            log_success "PostgreSQL 连接正常"
        else
            log_warn "PostgreSQL 可能未运行，尝试启动..."
            sudo systemctl start postgresql || true
        fi
    fi
else
    log_warn "未找到 DATABASE_URL 环境变量，跳过数据库检查"
fi

# 检查 Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        log_success "Redis 连接正常"
    else
        log_warn "Redis 可能未运行，尝试启动..."
        sudo systemctl start redis-server || true
    fi
else
    log_warn "未找到 redis-cli，跳过 Redis 检查"
fi

# ============================================
# 启动服务
# ============================================
log_info "启动服务..."

cd "$DEPLOY_DIR"

# 检查 PM2 配置文件
if [ ! -f "ecosystem.config.js" ]; then
    log_warn "未找到 ecosystem.config.js，使用默认配置"

    # 直接使用 PM2 启动
    for service in "${services[@]}"; do
        service_dir="$APP_DIR/$service"

        case $service in
            "api")
                pm2 start "$service_dir/dist/main.js" --name "good-trending-api" --cwd "$service_dir" || true
                ;;
            "web")
                pm2 start "$service_dir/server.js" --name "good-trending-web" --cwd "$service_dir" || true
                ;;
            "scheduler")
                pm2 start "$service_dir/dist/index.mjs" --name "good-trending-scheduler" --cwd "$service_dir" || true
                ;;
        esac
    done
else
    log_info "使用 ecosystem.config.js 启动所有服务..."
    pm2 start ecosystem.config.js
fi

# ============================================
# 保存配置
# ============================================
log_info "保存 PM2 配置..."
pm2 save

log_info "设置开机启动..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $HOME || log_warn "开机启动设置可能需要手动执行"

# ============================================
# 显示状态
# ============================================
echo ""
echo "=========================================="
echo "  服务启动完成！"
echo "=========================================="
echo ""

pm2 status

echo ""
echo "=========================================="
echo ""
echo "常用命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs"
echo "  重启服务: pm2 restart all"
echo "  停止服务: pm2 stop all"
echo "  监控资源: pm2 monit"
echo ""
echo "API 地址: http://localhost:3015"
echo "Web 地址: http://localhost:3010"
echo ""
echo "=========================================="
