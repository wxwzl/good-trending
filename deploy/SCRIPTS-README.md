# Good-Trending 部署脚本说明

本文档说明 `deploy/` 目录下所有脚本的使用方法。

## 目录结构

```
deploy/
├── ecosystem.config.js     # PM2 配置文件
├── install-ubuntu.sh       # Ubuntu 22.04 环境安装脚本
├── init-database.sh        # 数据库初始化脚本
├── start-all.sh            # 一键启动所有服务
├── nginx.conf              # Nginx 配置文件模板
├── .env                    # 环境变量文件（需要手动创建）
├── .env.production         # 生产环境配置示例
├── app/
│   ├── web/                # Web 前端部署包
│   ├── api/                # API 服务部署包
│   └── scheduler/          # 调度器部署包
└── logs/                   # 日志目录
```

## 快速开始

### 1. 准备服务器

在 Ubuntu 22.04 服务器上运行：

```bash
# 1. 上传 deploy 目录到服务器
scp -r deploy user@server:/tmp/

# 2. SSH 登录服务器
ssh user@server

# 3. 运行安装脚本
sudo bash /tmp/deploy/install-ubuntu.sh
```

安装脚本会自动安装：

- Node.js 20.x
- PM2（进程管理器）
- pnpm（包管理器）
- PostgreSQL 16
- Redis 7
- Nginx

### 2. 初始化数据库

```bash
# 切换到 postgres 用户
sudo -u postgres bash /opt/good-trending/init-database.sh

# 或者设置自定义参数
sudo -u postgres DB_NAME=mydb DB_USER=myuser bash /opt/good-trending/init-database.sh
```

脚本会输出 `DATABASE_URL`，请复制到环境变量文件中。

### 3. 配置环境变量

```bash
cd /opt/good-trending

# 复制生产环境配置
cp .env.production .env

# 编辑 .env 文件，填入实际配置
vim .env
```

必须配置的变量：

- `DATABASE_URL`: 数据库连接字符串
- `REDIS_URL`: Redis 连接字符串
- `API_URL`: API 服务地址
- `NEXT_PUBLIC_API_URL`: 前端访问的 API 地址

### 4. 部署应用包

```bash
# 在本地构建部署包
cd apps/web && pnpm run deploy:build
cd apps/api && pnpm run deploy:build
cd apps/scheduler && pnpm run deploy:build

# 方法1: 直接上传 deploy 目录
scp -r deploy user@server:/opt/

# 然后 SSH 登录启动
ssh user@server
cd /opt/deploy
pm2 start ecosystem.config.js

# 方法2: 压缩后上传
tar -czvf deploy.tar.gz deploy/
scp deploy.tar.gz user@server:/opt/
ssh user@server "cd /opt && tar -xzvf deploy.tar.gz && cd deploy && pm2 start ecosystem.config.js"
```

### 5. 启动服务

```bash
cd /opt/good-trending
bash start-all.sh
```

或者使用 PM2 直接启动：

```bash
cd /opt/good-trending
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 设置开机启动
pm2 startup
```

### 6. 配置 Nginx（可选）

```bash
# 复制配置文件
sudo cp /opt/good-trending/nginx.conf /etc/nginx/sites-available/good-trending

# 修改配置中的域名
sudo vim /etc/nginx/sites-available/good-trending

# 启用配置
sudo ln -s /etc/nginx/sites-available/good-trending /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 脚本详解

### install-ubuntu.sh

Ubuntu 22.04 环境一键安装脚本。

**功能：**

- 更新系统软件包
- 安装 Node.js 20.x
- 安装 PM2、pnpm
- 安装 PostgreSQL 16
- 安装 Redis 7
- 安装 Nginx
- 配置防火墙（UFW）
- 创建部署目录
- 配置日志轮转

**使用方法：**

```bash
sudo bash install-ubuntu.sh
```

### init-database.sh

PostgreSQL 数据库初始化脚本。

**功能：**

- 创建数据库用户
- 创建数据库
- 配置用户权限
- 配置 PostgreSQL 监听
- 生成 DATABASE_URL

**环境变量：**

- `DB_NAME`: 数据库名（默认: good_trending）
- `DB_USER`: 用户名（默认: good_trending）
- `DB_PASSWORD`: 密码（默认: 自动生成）
- `DB_HOST`: 主机（默认: localhost）
- `DB_PORT`: 端口（默认: 5432）

**使用方法：**

```bash
sudo -u postgres bash init-database.sh
```

### start-all.sh

一键启动所有服务。

**功能：**

- 检查环境变量
- 检查服务目录
- 安装缺失的依赖
- 检查数据库和 Redis 连接
- 使用 PM2 启动所有服务
- 保存 PM2 配置
- 设置开机启动

**使用方法：**

```bash
bash start-all.sh
```

### ecosystem.config.js

PM2 配置文件。

**功能：**

- 配置 3 个服务（web、api、scheduler）
- 集群模式（web 和 api）
- 内存限制和自动重启
- 日志配置
- 健康检查

**常用命令：**

```bash
pm2 start ecosystem.config.js    # 启动所有服务
pm2 status                       # 查看状态
pm2 logs                         # 查看日志
pm2 reload all                   # 平滑重启
pm2 restart all                  # 重启所有
pm2 stop all                     # 停止所有
pm2 delete all                   # 删除所有
pm2 monit                        # 监控资源
```

### nginx.conf

Nginx 配置文件模板。

**功能：**

- HTTP 重定向到 HTTPS
- SSL/TLS 配置
- 反向代理到 Web 和 API
- 静态资源缓存
- Gzip 压缩
- 安全 Headers

**使用方法：**

1. 替换 `your-domain.com` 为实际域名
2. 配置 SSL 证书路径
3. 复制到 Nginx 配置目录

## 常用命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs
pm2 logs good-trending-api
pm2 logs good-trending-web --lines 100

# 重启服务
pm2 restart all
pm2 restart good-trending-api

# 重载服务（平滑重启）
pm2 reload all

# 停止服务
pm2 stop all
pm2 stop good-trending-api

# 删除服务
pm2 delete all

# 监控资源
pm2 monit

# 保存配置
pm2 save

# 开机启动
pm2 startup
```

### 日志查看

```bash
# PM2 日志
pm2 logs

# 直接查看日志文件
tail -f /opt/good-trending/app/api/logs/app.log
tail -f /opt/good-trending/app/web/logs/app.log
tail -f /opt/good-trending/app/scheduler/logs/app.log

# Nginx 日志
sudo tail -f /var/log/nginx/good-trending-error.log
```

### 数据库管理

```bash
# 进入数据库
sudo -u postgres psql good_trending

# 查看连接
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# 备份数据库
sudo -u postgres pg_dump good_trending > backup.sql

# 恢复数据库
sudo -u postgres psql good_trending < backup.sql
```

### Redis 管理

```bash
# 进入 Redis CLI
redis-cli

# 查看信息
redis-cli info

# 查看队列
redis-cli keys "bull:*"

# 清空所有数据（谨慎使用）
redis-cli flushall
```

## 故障排查

### 服务无法启动

1. 检查日志：`pm2 logs`
2. 检查环境变量：`cat /opt/good-trending/.env`
3. 检查端口占用：`netstat -tlnp | grep 301`
4. 检查数据库连接：`pg_isready`
5. 检查 Redis 连接：`redis-cli ping`

### 数据库连接失败

1. 检查 PostgreSQL 是否运行：`sudo systemctl status postgresql`
2. 检查用户权限：`sudo -u postgres psql -c "\du"`
3. 检查数据库是否存在：`sudo -u postgres psql -l`
4. 检查 pg_hba.conf 配置

### 端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3010
sudo lsof -i :3015
sudo lsof -i :3017

# 杀掉进程
sudo kill -9 <PID>
```

### 权限问题

```bash
# 修复部署目录权限
sudo chown -R deploy:deploy /opt/good-trending

# 修复日志目录权限
sudo chmod 755 /opt/good-trending/app/*/logs
```

## 安全建议

1. **修改默认密码**：所有自动生成的密码都应该修改
2. **配置防火墙**：只开放必要的端口（22, 80, 443, 3010, 3015, 3017）
3. **使用 HTTPS**：配置 SSL/TLS 证书
4. **定期备份**：设置数据库自动备份
5. **监控日志**：配置日志告警
6. **更新软件**：定期更新系统和依赖

## 更新部署

```bash
# 1. 在本地重新构建
cd apps/web && pnpm run deploy:build
cd apps/api && pnpm run deploy:build
cd apps/scheduler && pnpm run deploy:build

# 2. 上传到服务器
scp -r deploy/app/* user@server:/opt/good-trending/app/

# 3. 在服务器上重载
ssh user@server "cd /opt/good-trending && pm2 reload all"
```

## 更多信息

- [PM2 文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 文档](https://nginx.org/en/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Redis 文档](https://redis.io/documentation)
