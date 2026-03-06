# CI/CD 环境变量配置指南

> 本文档说明 GitHub Actions 工作流所需的环境变量和 Secrets 配置。

---

## 目录

1. [GitHub Secrets 配置](#1-github-secrets-配置)
2. [GitHub Variables 配置](#2-github-variables-配置)
3. [环境变量说明](#3-环境变量说明)
4. [配置步骤](#4-配置步骤)

---

## 1. GitHub Secrets 配置

在 GitHub 仓库的 `Settings` -> `Secrets and variables` -> `Actions` 中配置以下 Secrets：

### 数据库相关

| Secret 名称         | 说明                 | 示例                                    |
| ------------------- | -------------------- | --------------------------------------- |
| `DATABASE_URL`      | 生产数据库连接字符串 | `postgresql://user:pass@host:5432/db`   |
| `TEST_DATABASE_URL` | 测试数据库连接字符串 | `postgresql://test:test@host:5432/test` |

### Redis 相关

| Secret 名称      | 说明            | 示例                     |
| ---------------- | --------------- | ------------------------ |
| `REDIS_URL`      | 生产 Redis 连接 | `redis://host:6379`      |
| `TEST_REDIS_URL` | 测试 Redis 连接 | `redis://localhost:6379` |

### 部署相关

| Secret 名称      | 说明                | 示例                              |
| ---------------- | ------------------- | --------------------------------- |
| `DEPLOY_HOST`    | 部署服务器地址      | `your-server.com`                 |
| `DEPLOY_USER`    | 部署服务器用户名    | `deploy`                          |
| `DEPLOY_SSH_KEY` | 部署服务器 SSH 私钥 | `-----BEGIN RSA PRIVATE KEY-----` |
| `DEPLOY_PATH`    | 部署路径            | `/var/www/good-trending`          |

### Docker 相关

| Secret 名称       | 说明              | 示例            |
| ----------------- | ----------------- | --------------- |
| `DOCKER_USERNAME` | Docker Hub 用户名 | `your-username` |
| `DOCKER_PASSWORD` | Docker Hub 密码   | `dckr_pat_xxx`  |

### 通知相关

| Secret 名称          | 说明              | 示例                          |
| -------------------- | ----------------- | ----------------------------- |
| `SLACK_WEBHOOK_URL`  | Slack Webhook URL | `https://hooks.slack.com/...` |
| `NOTIFICATION_EMAIL` | 通知接收邮箱      | `team@example.com`            |
| `SMTP_SERVER`        | SMTP 服务器地址   | `smtp.gmail.com`              |
| `SMTP_PORT`          | SMTP 端口         | `587`                         |
| `SMTP_USERNAME`      | SMTP 用户名       | `your-email@gmail.com`        |
| `SMTP_PASSWORD`      | SMTP 密码         | `your-app-password`           |

### Turbo 缓存相关

| Secret 名称   | 说明                     | 示例               |
| ------------- | ------------------------ | ------------------ |
| `TURBO_TOKEN` | Turbo Remote Cache Token | `your-turbo-token` |

---

## 2. GitHub Variables 配置

在 GitHub 仓库的 `Settings` -> `Secrets and variables` -> `Actions` -> `Variables` 标签页配置：

| Variable 名称         | 说明             | 示例                            |
| --------------------- | ---------------- | ------------------------------- |
| `TURBO_TEAM`          | Turbo Team 名称  | `good-trending`                 |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址    | `https://api.good-trending.com` |
| `DEPLOYMENT_URL`      | 部署后的访问地址 | `https://good-trending.com`     |

---

## 3. 环境变量说明

### 工作流中的环境变量

```yaml
env:
  NODE_VERSION: "20" # Node.js 版本
  PNPM_VERSION: "9.0.0" # pnpm 版本
```

### 运行时环境变量

以下环境变量在应用运行时使用：

| 变量名                | 说明             | 使用位置       |
| --------------------- | ---------------- | -------------- |
| `NODE_ENV`            | 运行环境         | 所有应用       |
| `DATABASE_URL`        | 数据库连接字符串 | API, Scheduler |
| `REDIS_URL`           | Redis 连接字符串 | API, Scheduler |
| `NEXT_PUBLIC_API_URL` | 前端 API 地址    | Web            |

---

## 4. 配置步骤

### 4.1 配置 Secrets

1. 进入 GitHub 仓库页面
2. 点击 `Settings` 标签
3. 在左侧菜单选择 `Secrets and variables` -> `Actions`
4. 点击 `New repository secret`
5. 输入 Secret 名称和值
6. 点击 `Add secret`

### 4.2 配置 Variables

1. 进入 `Secrets and variables` -> `Actions` 页面
2. 点击 `Variables` 标签
3. 点击 `New repository variable`
4. 输入 Variable 名称和值
5. 点击 `Add variable`

### 4.3 配置环境（可选）

对于需要不同配置的环境（如 staging, production）：

1. 在 `Secrets and variables` 页面点击 `Environments`
2. 创建新环境（如 `production`）
3. 为每个环境配置特定的 Secrets 和 Variables

---

## 5. 安全注意事项

1. **不要在代码中硬编码敏感信息**
2. **定期轮换 Secrets**（如 API 密钥、密码）
3. **使用最小权限原则**（如部署密钥只给必要的权限）
4. **审计 Secrets 访问日志**（GitHub Enterprise 功能）
5. **不要在日志中暴露 Secrets**（GitHub Actions 会自动隐藏）

---

## 6. 必需配置清单

最小配置（用于基本 CI）：

- [ ] `TEST_DATABASE_URL` - 测试数据库连接
- [ ] `TEST_REDIS_URL` - 测试 Redis 连接

完整配置（用于生产部署）：

- [ ] `DATABASE_URL` - 生产数据库
- [ ] `REDIS_URL` - 生产 Redis
- [ ] `DEPLOY_HOST` - 部署服务器
- [ ] `DEPLOY_USER` - 部署用户
- [ ] `DEPLOY_SSH_KEY` - SSH 密钥
- [ ] `DEPLOY_PATH` - 部署路径
- [ ] `SLACK_WEBHOOK_URL` - Slack 通知（可选）
- [ ] `DOCKER_USERNAME` - Docker Hub 用户名（可选）
- [ ] `DOCKER_PASSWORD` - Docker Hub 密码（可选）

---

_最后更新: 2026-03-06_
