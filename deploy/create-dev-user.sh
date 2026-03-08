#!/bin/bash
#
# 创建 Linux 开发账号脚本
# 创建 dev 用户并配置 sudo 权限
#
# 使用方法:
# sudo bash create-dev-user.sh
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

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 配置
USERNAME="${USERNAME:-dev}"
PASSWORD="${PASSWORD:-$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-16)}"
SHELL="${SHELL:-/bin/bash}"

log_info "开始创建开发账号..."
echo "  用户名: $USERNAME"
echo "  密码: $PASSWORD"
echo "  Shell: $SHELL"
echo ""

# 检查用户是否已存在
if id "$USERNAME" &>/dev/null; then
    log_warn "用户 $USERNAME 已存在"
    read -p "是否删除并重新创建? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "删除现有用户..."
        userdel -r "$USERNAME" 2>/dev/null || true
        log_success "现有用户已删除"
    else
        log_info "跳过创建，使用现有用户"
        exit 0
    fi
fi

# 创建用户
log_info "创建用户 $USERNAME..."
useradd -m -s "$SHELL" -G sudo,docker "$USERNAME" 2>/dev/null || useradd -m -s "$SHELL" -G sudo "$USERNAME"

# 设置密码
echo "$USERNAME:$PASSWORD" | chpasswd

log_success "用户 $USERNAME 创建成功"

# 配置 sudo 免密码（可选）
log_info "配置 sudo 权限..."
echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USERNAME"
chmod 440 "/etc/sudoers.d/$USERNAME"

log_success "sudo 免密码配置完成"

# 配置 SSH 密钥（如果有）
if [ -f "$HOME/.ssh/authorized_keys" ]; then
    log_info "配置 SSH 密钥..."
    DEV_HOME=$(eval echo ~$USERNAME)
    mkdir -p "$DEV_HOME/.ssh"
    cp "$HOME/.ssh/authorized_keys" "$DEV_HOME/.ssh/"
    chown -R "$USERNAME:$USERNAME" "$DEV_HOME/.ssh"
    chmod 700 "$DEV_HOME/.ssh"
    chmod 600 "$DEV_HOME/.ssh/authorized_keys"
    log_success "SSH 密钥已复制"
fi

# 设置用户家目录权限
log_info "设置家目录权限..."
DEV_HOME=$(eval echo ~$USERNAME)
chown -R "$USERNAME:$USERNAME" "$DEV_HOME"
chmod 755 "$DEV_HOME"
log_success "家目录权限已设置: $DEV_HOME"

# 显示用户信息
echo ""
echo "=========================================="
echo "  开发账号创建完成！"
echo "=========================================="
echo ""
echo "账号信息:"
echo "  用户名: $USERNAME"
echo "  密码: $PASSWORD"
echo "  家目录: /home/$USERNAME"
echo ""
echo "使用方法:"
echo "  切换用户: su - $USERNAME"
echo "  SSH 登录: ssh $USERNAME@<服务器IP>"
echo "  免密 sudo: sudo <命令>"
echo ""
echo "建议操作:"
echo "  1. 立即修改密码: passwd $USERNAME"
echo "  2. 添加 SSH 公钥: ~/.ssh/authorized_keys"
echo "  3. 测试 sudo 权限: sudo whoami"
echo ""
echo "=========================================="
echo ""

# 保存账号信息
INFO_FILE="/root/.dev-user-info"
echo "$(date): Created user $USERNAME with password $PASSWORD" >> "$INFO_FILE"
chmod 600 "$INFO_FILE"
log_info "账号信息已保存到: $INFO_FILE"
