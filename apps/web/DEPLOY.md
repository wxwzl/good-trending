# Web 项目部署说明

## 快速开始

执行一条命令即可完成部署构建：

```bash
cd apps/web
pnpm run deploy:build
```

构建完成后，部署包位于项目根目录的 `deploy/` 文件夹中。

## 部署包结构

```
deploy/
├── .env                      # 基础环境变量配置
├── .env.production           # 生产环境配置（需要根据实际情况修改）
├── README.md                 # 部署说明
├── .gitignore               # 部署包忽略文件
└── app/web/
    ├── .next/               # Next.js 构建产物
    ├── node_modules/        # 生产依赖（standalone 模式已包含）
    ├── public/              # 静态资源
    ├── logs/                # 日志输出目录
    ├── scripts/             # 启动脚本
    │   └── deploy-server.js # 带日志的启动脚本
    ├── server.js            # Next.js standalone 服务器
    └── package.json         # 部署包配置
```

## 部署步骤

### 1. 构建部署包

```bash
cd apps/web
pnpm run deploy:build
```

### 2. 配置生产环境变量

编辑 `deploy/.env.production`，配置实际的生产环境参数：

```bash
# 必须修改的配置
DATABASE_URL=postgresql://用户名:密码@数据库主机:5432/数据库名?schema=public
REDIS_URL=redis://redis主机:6379
API_URL=http://api服务地址:3015/api/v1
NEXT_PUBLIC_API_URL=https://你的域名.com/api/v1

# 端口配置（可选，默认 3010）
WEB_PORT=3010
```

### 3. 复制部署包到服务器

```bash
# 将 deploy 目录打包
 tar -czvf web-deploy.tar.gz deploy/

# 上传到服务器并解压
scp web-deploy.tar.gz user@server:/opt/
ssh user@server "cd /opt && tar -xzvf web-deploy.tar.gz"
```

### 4. 在服务器上启动服务

**方式一：使用内置服务器（简单方式）**

```bash
cd /opt/deploy/app/web
node server.js
```

环境变量：

- `PORT` - 服务端口（默认 3010）
- `HOSTNAME` - 服务主机（默认 0.0.0.0）

**方式二：使用带日志的启动脚本（推荐）**

```bash
cd /opt/deploy/app/web
node scripts/deploy-server.js
```

日志输出位置：

- `logs/app-YYYY-MM-DD.log` - 应用日志
- `logs/error-YYYY-MM-DD.log` - 错误日志

**方式三：使用 PM2 管理进程（生产推荐）**

```bash
npm install -g pm2

cd /opt/deploy/app/web
pm2 start server.js --name "web-app" \
  --env PORT=3010 \
  --env HOSTNAME=0.0.0.0 \
  --log logs/app.log \
  --error logs/error.log

# 保存配置
pm2 save
pm2 startup
```

### 5. 验证部署

```bash
# 检查服务是否运行
curl http://localhost:3010

# 查看日志
tail -f /opt/deploy/app/web/logs/app-$(date +%Y-%m-%d).log
```

## 重要说明

### 关于构建时的环境配置

部署脚本在构建时使用了特殊处理：

- 构建阶段使用 `.env.development` 配置（避免构建时依赖生产 API）
- 部署阶段加载 `deploy/.env.production` 配置

这意味着你不需要在构建前配置好生产 API 地址，只需在部署前配置好环境变量即可。

### 关于 standalone 模式

Next.js standalone 模式的特点：

1. 只包含运行所需的最小依赖，体积小
2. 无需安装完整的 node_modules
3. 启动速度快
4. 适合容器化部署

### 安全性注意事项

1. **不要提交敏感信息到代码仓库**
   - `.env.production` 应该只存在于服务器上
   - 使用 `.env.production.local` 覆盖本地敏感配置

2. **日志文件管理**
   - 日志文件会持续增长，建议配置 logrotate
   - 示例 logrotate 配置：
     ```
     /opt/deploy/app/web/logs/*.log {
       daily
       rotate 30
       compress
       delaycompress
       missingok
       notifempty
       create 644 user user
     }
     ```

3. **HTTPS 配置**
   - 生产环境建议使用 Nginx 反向代理
   - 在 Nginx 层配置 SSL/TLS
   - 内部服务可以使用 HTTP

## Nginx 反向代理配置示例

```nginx
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
}
```

## 故障排查

### 1. 启动失败，提示端口被占用

```bash
# 查找占用端口的进程
lsof -i :3010
# 或
netstat -tulpn | grep 3010

# 更换端口启动
PORT=3020 node server.js
```

### 2. 无法连接 API 服务

检查 `.env.production` 中的 `API_URL` 配置：

- 确保 API 服务已启动
- 确保网络可达
- 检查防火墙设置

### 3. 日志文件权限错误

```bash
# 修复日志目录权限
chmod 755 /opt/deploy/app/web/logs
chown -R $(whoami) /opt/deploy/app/web/logs
```

## 更新部署

1. 在本地重新构建部署包：

   ```bash
   cd apps/web
   pnpm run deploy:build
   ```

2. 上传到服务器并替换

3. 平滑重启服务：
   ```bash
   pm2 reload web-app
   ```

---

**注意**：部署包不包含源码，只包含构建产物。如需修改代码，请在本地修改后重新构建部署包。
