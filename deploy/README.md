# Web 部署包

## 目录结构

```
deploy/
├── .env                    # 环境变量配置
├── .env.production         # 生产环境配置
├── app/web/
│   ├── .next/             # Next.js 构建产物
│   ├── node_modules/      # 生产依赖
│   ├── public/            # 静态资源
│   ├── logs/              # 日志目录
│   ├── scripts/           # 启动脚本
│   ├── server.js          # Next.js standalone 服务器
│   └── package.json       # 部署包配置
```

## 启动方式

### 方式 1：使用内置服务器（推荐）

```bash
cd deploy/app/web
pnpm install --production
node server.js
```

环境变量配置：

- PORT: 服务端口（默认 3010）
- HOSTNAME: 服务主机（默认 0.0.0.0）

### 方式 2：使用带日志的启动脚本

```bash
cd deploy/app/web
pnpm install --production
node scripts/deploy-server.js
```

日志将输出到 logs/ 目录：

- logs/app-YYYY-MM-DD.log: 应用日志
- logs/error-YYYY-MM-DD.log: 错误日志

### 方式 3：使用环境变量指定配置

```bash
cd deploy/app/web
export PORT=8080
export HOSTNAME=0.0.0.0
export LOGS_DIR=/var/log/web
node scripts/deploy-server.js
```

## 环境变量

必需的环境变量：

- API_URL: API 服务地址（如 http://localhost:3015/api/v1）
- NEXT_PUBLIC_API_URL: 客户端 API 地址

可选的环境变量：

- PORT: Web 服务端口（默认 3010）
- HOSTNAME: 服务监听地址（默认 0.0.0.0）
- WEB_PORT: 同 PORT
- NODE_ENV: 运行环境（默认 production）

## 注意事项

1. 部署包不包含源码，只包含构建产物
2. 需要 Node.js >= 20.0.0
3. 建议使用 PM2 或 systemd 管理进程
4. 日志文件会自动轮转，建议配置 logrotate
