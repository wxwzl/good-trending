# Nginx 部署配置

> Good-Trending 的 Nginx 反向代理配置

---

## 配置文件说明

### 主要文件

| 文件 | 用途 |
|------|------|
| `godtrending.conf` | 主站点配置（HTTP + HTTPS） |

### 流量转发规则

```
用户请求
    ↓
Nginx (80/443)
    ↓
    ├── /backend/api/* ──→ http://localhost:3015/api/v1 (API 服务)
    └── /* ──────────────→ http://localhost:3010 (Next.js Web 前端)
```

---

## 部署步骤

### 1. 上传配置文件

```bash
# 上传到服务器
scp deploy/nginx/godtrending.conf root@your-server:/etc/nginx/sites-available/godtrending

# SSH 登录服务器后创建软链接
sudo ln -sf /etc/nginx/sites-available/godtrending /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default
```

### 2. 安装 SSL 证书（Let's Encrypt）

```bash
# 安装 certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 创建证书目录
sudo mkdir -p /var/www/certbot

# 申请证书（确保域名已解析到服务器）
sudo certbot --nginx -d www.godtrending.com -d godtrending.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 3. 测试并重载 Nginx

```bash
# 检查配置语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx

# 查看状态
sudo systemctl status nginx
```

---

## 验证部署

### 检查服务状态

```bash
# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/godtrending.error.log

# 查看访问日志
sudo tail -f /var/log/nginx/godtrending.access.log

# 测试本地服务是否可访问
curl http://localhost:3010
curl http://localhost:3015/api/v1/health
```

### 外部访问测试

```bash
# 测试 HTTP 重定向
curl -I http://www.godtrending.com

# 测试 HTTPS
curl -I https://www.godtrending.com

# 测试 API
curl https://www.godtrending.com/backend/api/health
```

---

## 故障排查

### 502 Bad Gateway

```bash
# 1. 检查后端服务是否运行
pm2 list

# 2. 检查端口监听
sudo ss -tlnp | grep -E '3010|3015'

# 3. 检查防火墙
sudo ufw status
```

### SSL 证书问题

```bash
# 查看证书状态
sudo certbot certificates

# 手动续期
sudo certbot renew

# 重新申请证书
sudo certbot --nginx -d www.godtrending.com --force-renewal
```

---

## 相关配置

### .env.production 对应关系

| 环境变量 | Nginx 配置 |
|----------|-----------|
| `WEB_PORT=3010` | `proxy_pass http://127.0.0.1:3010` |
| `API_PORT=3015` | `proxy_pass http://127.0.0.1:3015` |
| `NEXT_PUBLIC_API_URL=/backend/api/v1` | `location /backend/api/` |

---

## 安全特性

- ✅ HTTP 自动重定向到 HTTPS
- ✅ TLS 1.2/1.3 支持
- ✅ HSTS 预加载（由 Let's Encrypt 配置）
- ✅ 安全响应头（X-Frame-Options, X-Content-Type-Options 等）
- ✅ 静态文件缓存优化
- ✅ Gzip 压缩

---

_配置文件位置: `deploy/nginx/godtrending.conf`_
