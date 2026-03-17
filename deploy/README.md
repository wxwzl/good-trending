# Good-Trending 部署包

本文档描述部署包的结构和使用方法。

## 目录结构

```
deploy/
├── .env.production         # 生产环境配置（必需）
├── start-all.cjs          # 自动化启动脚本（安装依赖+启动服务）
├── nginx/                  # Nginx 配置文件
│   ├── godtrending.conf    # 站点配置
│   └── README.md           # Nginx 配置说明
├── scripts/                # 部署脚本
│   ├── deploy.cjs          # 部署脚本（打包/上传）
│   └── README.md           # 脚本使用说明
├── app/                    # 应用部署目录（构建后生成）
│   ├── api/               # API 服务
│   ├── web/               # Web 前端
│   ├── scheduler/         # 调度器服务
│   └── database/          # 数据库迁移
├── create-dev-user.sh     # 创建开发用户脚本
├── ecosystem.config.js    # PM2 配置文件
├── init-database.sh       # 数据库初始化脚本
└── install-ubuntu.sh      # Ubuntu 环境安装脚本
```

## 部署流程

### 1. 构建部署包

在项目根目录执行：

```bash
# 构建所有应用并打包
pnpm run build:tar

# 或分步执行
pnpm run deploy:build    # 构建所有应用
pnpm run deploy:pack     # 打包 deploy 目录
```

打包后的压缩包位于 `dist/deploy-YYYYMMDD-HHMMSS.tar.gz`

### 2. 上传到服务器

使用部署脚本上传：

```bash
# 密码认证
node scripts/deploy.cjs deploy -h <服务器IP> -u root -p <密码>

# 密钥认证
node scripts/deploy.cjs deploy -h <服务器IP> -u root -k ~/.ssh/id_rsa
```

### 3. 服务器端部署

SSH 到服务器后执行：

#### 方式一：使用自动化脚本（推荐）

```bash
cd /workspace
tar -xzf deploy-*.tar.gz
cd deploy

# 1. 先执行数据库迁移（只需执行一次）
cd app/database
pnpm install
pnpm migrate
cd ../..

# 2. 使用自动化脚本安装依赖并启动所有服务
node start-all.cjs
```

**start-all.cjs 脚本选项：**

```bash
# 完整流程：安装依赖 + 启动服务（默认）
node start-all.cjs

# 仅安装依赖
node start-all.cjs --only-install

# 跳过安装，直接启动/重启服务
node start-all.cjs --skip-install

# 强制重启所有服务
node start-all.cjs --restart
```

#### 方式二：手动部署

```bash
cd /workspace
tar -xzf deploy-*.tar.gz
cd deploy

# 1. 安装依赖并执行数据库迁移
cd app/database
pnpm install
pnpm migrate
cd ../..

# 2. 启动 API 服务
cd app/api
pnpm install --production
pm2 start dist/main.js --name "api"
cd ../..

# 3. 启动 Web 服务
cd app/web
pnpm install --production
pm2 start server.js --name "web"
cd ../..

# 4. 启动 Scheduler
cd app/scheduler
pnpm install --production
pm2 start dist/main.js --name "scheduler"
```

#### 方式三：使用 PM2 配置文件

```bash
pm2 start ecosystem.config.js
```

## 环境变量

### 必需的环境变量

在 `deploy/.env.production` 中配置：

```bash
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/goodtrending

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3015

# Web
PORT=3010
API_URL=http://localhost:3015/api/v1
NEXT_PUBLIC_API_URL=http://localhost:3015/api/v1
```

## 各应用启动方式

### API 服务

```bash
cd deploy/app/api
pnpm install --production
node dist/main.js
```

- 端口：3015（默认）
- 日志：logs/ 目录

### Web 服务

```bash
cd deploy/app/web
pnpm install --production
node server.js
```

- 端口：3010（默认）
- 日志：logs/ 目录

### Scheduler 服务

```bash
cd deploy/app/scheduler
pnpm install --production
node dist/main.js
```

### Database 迁移

```bash
cd deploy/app/database
pnpm install
pnpm migrate
```

## 注意事项

1. **Node.js 版本**：需要 >= 20.0.0
2. **数据库**：需要 PostgreSQL 和 Redis 服务
3. **环境变量**：确保 `.env.production` 配置正确
4. **端口**：确保所需端口未被占用
5. **进程管理**：生产环境建议使用 PM2

## 故障排查

### 检查服务状态

```bash
pm2 status
pm2 logs api
pm2 logs web
pm2 logs scheduler
```

### 查看日志

```bash
# API 日志
tail -f deploy/app/api/logs/app-$(date +%Y-%m-%d).log

# Web 日志
tail -f deploy/app/web/logs/app-$(date +%Y-%m-%d).log
```

### 重启服务

```bash
pm2 restart api
pm2 restart web
pm2 restart scheduler
```
