#!/bin/bash
#
# Good-Trending Ubuntu 22.04 部署环境安装脚本（剩余部分）
# 用于继续安装 PostgreSQL、Redis、Nginx 等
#
# 使用方法:
# 1. chmod +x install-ubuntu-remaining.sh
# 2. sudo ./install-ubuntu-remaining.sh
#

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 获取当前用户（用于设置目录权限）
CURRENT_USER=${SUDO_USER:-$USER}
CURRENT_USER_HOME=$(eval echo ~$CURRENT_USER)

log_info "继续安装 Good-Trending 部署环境（剩余部分）..."
log_info "当前用户: $CURRENT_USER"

# ============================================
# 6. 安装 PostgreSQL 16
# ============================================
log_info "安装 PostgreSQL 16..."
if ! command -v psql &> /dev/null; then
    # 添加 PostgreSQL 官方源（使用 keyring 方式，apt-key 已弃用）
    log_info "添加 PostgreSQL 官方源..."

    # 安装依赖
    apt-get install -y postgresql-common

    # 使用 PostgreSQL 官方脚本添加源（自动处理 GPG 密钥）
    yes | /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh || true

    # 如果官方脚本失败，使用备用方案
    if [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
        log_warn "官方脚本失败，使用备用方案..."

        # 下载并保存 GPG 密钥到 keyring（现代方式）
        wget -qO - https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
            gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

        # 添加源，使用 signed-by 指向 keyring
        echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    fi

    apt-get update
    apt-get install -y postgresql-16 postgresql-client-16 postgresql-contrib-16

    # 启动 PostgreSQL
    systemctl enable postgresql
    systemctl start postgresql

    log_success "PostgreSQL 16 安装完成"
else
    log_warn "PostgreSQL $(psql --version | awk '{print $3}') 已安装，跳过"
fi

# ============================================
# 7. 安装 Redis 7
# ============================================
log_info "安装 Redis 7..."
if ! command -v redis-cli &> /dev/null; then
    # 使用 Ubuntu 官方源安装 Redis（比 PPA 更稳定）
    apt-get install -y redis-server

    # 配置 Redis
    sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
    sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf

    # 启动 Redis
    systemctl enable redis-server
    systemctl restart redis-server

    log_success "Redis 7 安装完成"
else
    log_warn "Redis $(redis-cli --version | awk '{print $2}') 已安装，跳过"
fi

# ============================================
# 8. 安装 Nginx
# ============================================
log_info "安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx

    # 启动 Nginx
    systemctl enable nginx
    systemctl start nginx

    log_success "Nginx 安装完成"
else
    log_warn "Nginx $(nginx -v 2>&1 | awk -F'/' '{print $2}') 已安装，跳过"
fi

# ============================================
# 9. 配置防火墙（默认禁用）
# ============================================
# log_info "配置防火墙..."
# if command -v ufw &> /dev/null; then
#     ufw --force reset
#     ufw default deny incoming
#     ufw default allow outgoing
#     ufw allow 22/tcp    # SSH
#     ufw allow 80/tcp    # HTTP
#     ufw allow 443/tcp   # HTTPS
#     ufw allow 3010/tcp  # Web
#     ufw allow 3015/tcp  # API
#     ufw allow 3017/tcp  # Scheduler
#     ufw --force enable
#     log_success "防火墙配置完成"
# else
#     apt-get install -y ufw
#     log_warn "UFW 刚安装，请手动配置"
# fi

# ============================================
# 10. 创建部署目录
# ============================================
log_info "创建部署目录..."
DEPLOY_DIR="/opt/good-trending"
mkdir -p $DEPLOY_DIR
chown -R $CURRENT_USER:$CURRENT_USER $DEPLOY_DIR
log_success "部署目录准备完成: $DEPLOY_DIR"
log_info "请将 deploy 目录上传到 $DEPLOY_DIR"

# ============================================
# 11. 配置 logrotate
# ============================================
log_info "配置日志轮转..."
cat > /etc/logrotate.d/good-trending << 'EOF'
/opt/*/deploy/app/*/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 deploy deploy
    sharedscripts
    postrotate
        pm2 reloadLogs > /dev/null 2>&1 || true
    endscript
}
EOF
log_success "日志轮转配置完成"

# ============================================
# 12. 配置系统参数
# ============================================
log_info "优化系统参数..."
cat >> /etc/sysctl.conf << 'EOF'

# Good-Trending 应用优化
# 增加文件描述符限制
fs.file-max = 65535

# TCP 连接优化
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535

# 内存优化
vm.swappiness = 10
EOF

sysctl -p

# 配置 ulimit
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
deploy soft nofile 65535
deploy hard nofile 65535
EOF

log_success "系统参数优化完成"

# ============================================
# 安装完成
# ============================================
echo ""
echo "=========================================="
echo "  Good-Trending 部署环境安装完成！"
echo "=========================================="
echo ""
echo "已安装软件:"
echo "  - PostgreSQL: $(psql --version | awk '{print $3}')"
echo "  - Redis: $(redis-cli --version | awk '{print $2}')"
echo "  - Nginx: $(nginx -v 2>&1 | awk -F'/' '{print $2}')"
echo ""
echo "部署目录: $DEPLOY_DIR"
echo ""
echo "下一步:"
echo "  1. 上传部署包到 $DEPLOY_DIR"
echo "  2. 配置环境变量: cp .env.production $DEPLOY_DIR/.env"
echo "  3. 初始化数据库: sudo -u postgres ./init-database.sh"
echo "  4. 启动服务: pm2 start ecosystem.config.js"
echo "  5. 保存配置: pm2 save"
echo "  6. 设置开机启动: pm2 startup"
echo ""
