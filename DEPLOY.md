# Good-Trending 项目部署指南

## 快速开始

### 构建所有部署包

```bash
# 构建 Web 部署包
cd apps/web && pnpm run deploy:build

# 构建 API 部署包
cd apps/api && pnpm run deploy:build

# 构建 Scheduler 部署包
cd apps/scheduler && pnpm run deploy:build
```

构建完成后，所有部署包位于项目根目录的 `deploy/` 文件夹中。

## 部署包结构

```
deploy/
├── .env                      # 基础环境变量配置
├── .env.production           # 生产环境配置（需要根据实际情况修改）
├── README.md                 # 部署说明
├── app/
│   ├── web/                 # Web 前端部署包
│   │   ├── .next/          # Next.js 构建产物
│   │   ├── node_modules/   # 生产依赖
│   │   ├── public/         # 静态资源
│   │   ├── logs/           # 日志输出目录
│   │   ├── scripts/        # 启动脚本
│   │   ├── server.js       # Next.js standalone 服务器
│   │   └── package.json    # 部署包配置
│   │
│   ├── api/                 # API 服务部署包
│   │   ├── dist/           # NestJS 构建产物
│   │   ├── logs/           # 日志目录
│   │   ├── scripts/        # 启动脚本
│   │   └── package.json    # 部署包配置
│   │
│   └── scheduler/           # 调度器部署包
│       ├── dist/           # tsup 构建产物
│       ├── logs/           # 日志目录
│       ├── scripts/        # 启动脚本
│       └── package.json    # 部署包配置
```

## 各服务部署说明

### Web 前端 (Next.js)

```bash
cd deploy/app/web
pnpm install --production

# 方式 1: 直接启动
node server.js

# 方式 2: 带日志启动
node scripts/deploy-server.js

# 方式 3: PM2 管理
pm2 start server.js --name "web-app"
```

- 默认端口: 3010
- 日志位置: `logs/app-YYYY-MM-DD.log`

### API 服务 (NestJS)

```bash
cd deploy/app/api
pnpm install --production

# 方式 1: 直接启动
node dist/main.js

# 方式 2: 带日志启动
node scripts/deploy-server.js

# 方式 3: PM2 管理
pm2 start dist/main.js --name "api-service"
```

- 默认端口: 3015
- 日志位置: `logs/app-YYYY-MM-DD.log`

### Scheduler 调度器 (BullMQ)

```bash
cd deploy/app/scheduler
pnpm install --production

# 方式 1: 直接启动
node dist/index.mjs

# 方式 2: 带日志启动
node scripts/deploy-server.js

# 方式 3: PM2 管理
pm2 start dist/index.mjs --name "scheduler-service"
```

- 默认端口: 3017
- 日志位置: `logs/app-YYYY-MM-DD.log`

## 环境变量配置

编辑 `deploy/.env.production`，配置实际的生产环境参数：

```bash
# 数据库配置
DATABASE_URL=postgresql://用户名:密码@数据库主机:5432/数据库名?schema=public

# Redis 配置
REDIS_URL=redis://redis主机:6379

# API 配置
API_URL=http://api服务地址:3015/api/v1
NEXT_PUBLIC_API_URL=https://你的域名.com/api/v1

# 端口配置
WEB_PORT=3010
API_PORT=3015
SCHEDULER_PORT=3017

# CORS 配置
CORS_ORIGINS=https://你的域名.com

# 其他配置
CRAWL_SCHEDULE=0 */6 * * *
```

## 生产环境部署步骤

### 1. 准备服务器

```bash
# 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2
```

### 2. 构建并上传部署包

```bash
# 本地构建
pnpm run deploy:build  # 在各应用目录执行

# 打包
tar -czvf deploy.tar.gz deploy/

# 上传到服务器
scp deploy.tar.gz user@server:/opt/
ssh user@server "cd /opt && tar -xzvf deploy.tar.gz"
```

### 3. 配置环境变量

在服务器上编辑 `deploy/.env.production`，填入实际配置。

### 4. 启动服务

```bash
cd /opt/deploy

# Web
pm2 start app/web/server.js --name "web-app" --env PORT=3010

# API
pm2 start app/api/dist/main.js --name "api-service" --env API_PORT=3015

# Scheduler
pm2 start app/scheduler/dist/index.mjs --name "scheduler-service"

# 保存配置
pm2 save
pm2 startup
```

### 5. 配置 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/good-trending

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Web 前端
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API 服务
    location /api/v1/ {
        proxy_pass http://localhost:3015/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 更新部署

```bash
# 1. 本地重新构建
cd apps/web && pnpm run deploy:build
cd apps/api && pnpm run deploy:build
cd apps/scheduler && pnpm run deploy:build

# 2. 打包并上传
tar -czvf deploy.tar.gz deploy/
scp deploy.tar.gz user@server:/opt/

# 3. 服务器上更新
ssh user@server "
  cd /opt
  pm2 stop all
  tar -xzvf deploy.tar.gz
  pm2 start all
"
```

## 故障排查

### 查看日志

```bash
# Web 日志
tail -f deploy/app/web/logs/app-$(date +%Y-%m-%d).log

# API 日志
tail -f deploy/app/api/logs/app-$(date +%Y-%m-%d).log

# Scheduler 日志
tail -f deploy/app/scheduler/logs/app-$(date +%Y-%m-%d).log
```

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
pm2 restart all

# 重载服务（平滑重启）
pm2 reload all
```

## 注意事项

1. **部署包不包含源码**，只包含构建产物和必要的依赖
2. **需要 Node.js >= 20.0.0**
3. **需要 PostgreSQL 和 Redis 服务**
4. **建议配置 logrotate** 管理日志文件
5. **生产环境建议使用 HTTPS** 和 Nginx 反向代理
6. **首次部署前** 确保修改 `.env.production` 中的配置

## 文件说明

- `deploy/.env` - 基础环境配置
- `deploy/.env.production` - 生产环境配置（需修改）
- `deploy/app/*/README.md` - 各服务的详细部署说明
- `deploy/app/*/.gitignore` - 忽略日志和本地配置文件

---

**最后更新**: 2026-03-09
