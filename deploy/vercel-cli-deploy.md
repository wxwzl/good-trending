# Vercel CLI 部署指南

> 使用 Vercel CLI 命令行工具部署 Web 前端

## 适用场景

- 本地快速测试部署效果
- 临时演示或预览
- 不想配置 Git 集成
- CI/CD 流程中自动部署

## 前置要求

- Node.js 18+
- 项目已构建成功
- 已有 Vercel 账号

## 安装 Vercel CLI

```bash
# 全局安装
npm install -g vercel

# 或使用 pnpm
pnpm add -g vercel

# 验证安装
vercel --version
```

## 首次配置

### 1. 登录 Vercel

```bash
vercel login
```

会打开浏览器让你授权，支持：

- GitHub 账号
- GitLab 账号
- Bitbucket 账号
- Email 注册

### 2. 进入项目目录

```bash
cd apps/web
```

### 3. 初始化项目（首次）

```bash
vercel
```

交互式配置：

```
? Set up and deploy "~/projects/good-trending/apps/web"? [Y/n] y
? Which scope do you want to deploy to? [你的用户名]
? Link to existing project? [y/N] n
? What's your project name? [good-trending-web]
? In which directory is your code located? [./]
? Want to modify these settings? [y/N] n
```

初始化后会生成 `.vercel/` 目录（已加入 .gitignore，无需提交）

## 部署命令

### 开发环境（预览）

```bash
# 部署到预览环境（自动生成随机 URL）
vercel

# 输出示例
# 🔗  https://good-trending-web-xxx.vercel.app
```

### 生产环境

```bash
# 部署到生产环境（使用正式域名）
vercel --prod

# 或使用别名
vercel production
```

### 指定环境变量

```bash
# 部署时指定环境变量
vercel --prod -e NEXT_PUBLIC_API_URL=https://api.example.com/api/v1

# 或使用 .env.production 文件
vercel --prod --env-file .env.production
```

## 环境变量配置

### 方式 1：命令行设置

```bash
# 添加环境变量
vercel env add NEXT_PUBLIC_API_URL
# ? What’s the value of NEXT_PUBLIC_API_URL? https://api.example.com/api/v1
# ? Add NEXT_PUBLIC_API_URL to which Environments (used for “vc --prod”)?  [始终选择 Production]

# 查看环境变量
vercel env ls

# 删除环境变量
vercel env rm NEXT_PUBLIC_API_URL
```

### 方式 2：使用 .env 文件

```bash
# 从 .env 文件导入
vercel env pull

# 导出到 .env 文件
vercel env pull .env.production
```

### 方式 3：Dashboard 网页配置

```bash
# 打开项目设置页面
vercel project
```

## 常用命令

### 部署相关

```bash
vercel                    # 部署到预览环境
vercel --prod            # 部署到生产环境
vercel --version         # 查看版本
vercel --help            # 查看帮助
```

### 项目信息

```bash
vercel list              # 列出所有项目
vercel inspect [url]     # 查看部署详情
vercel logs [url]        # 查看日志
```

### 域名管理

```bash
vercel domains ls                    # 列出域名
vercel domains add example.com       # 添加域名
vercel domains rm example.com        # 删除域名
vercel domains inspect example.com   # 查看域名详情
```

### 其他操作

```bash
vercel remove [project]  # 删除项目
vercel switch [team]     # 切换团队
vercel whoami            # 查看当前用户
```

## 完整部署流程

```bash
# 1. 确保在 web 目录
cd apps/web

# 2. 安装依赖
pnpm install

# 3. 本地构建（可选，vercel 会自动构建）
pnpm build

# 4. 检查环境变量
cat .env.production | grep NEXT_PUBLIC

# 5. 部署到生产环境
vercel --prod

# 6. 复制部署后的域名，更新 API 的 CORS 配置
```

## 在 CI/CD 中使用

### GitHub Actions 示例

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web to Vercel

on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Deploy to Vercel
        run: |
          cd apps/web
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 获取 Token

```bash
# 生成 Access Token
vercel tokens create

# 查看 Org ID 和 Project ID
cat .vercel/project.json
```

## 与本地构建结合

如果你想本地构建后再上传（类似之前的本地构建部署方案）：

```bash
# 1. 本地构建
cd apps/web
pnpm build

# 2. 使用 vercel 部署（会自动检测构建输出）
vercel --prod

# 或者指定输出目录
vercel --prod --cwd .next
```

**注意**：Vercel 默认会重新构建，如果想跳过构建直接上传，需要配置：

```json
// vercel.json
{
  "buildCommand": "echo 'Skip build'",
  "outputDirectory": ".next"
}
```

## 常见问题

### Q1: 部署失败，提示 "Command failed"

```bash
# 查看详细错误
vercel --debug

# 检查环境变量是否正确设置
vercel env ls
```

### Q2: 如何只上传不构建？

Vercel 设计理念是"构建+部署"一体化，不支持纯上传。
如果想本地构建，建议使用服务器部署方案。

### Q3: 部署后环境变量不生效？

```bash
# 重新部署触发环境变量更新
vercel --prod

# 或者先清除缓存
vercel --prod --force
```

### Q4: 如何回滚到上个版本？

```bash
# 查看部署历史
vercel ls

# 回滚到指定版本（通过 URL）
vercel --prod https://good-trending-web-xxx.vercel.app

# 或者在 Dashboard 点击"Promote to Production"
vercel
```

### Q5: 本地开发如何访问生产环境 API？

```bash
# 创建本地环境变量文件
echo "NEXT_PUBLIC_API_URL=http://localhost:3015/api/v1" > .env.local

# 开发时使用本地 API
pnpm dev

# 部署时自动使用生产 API（通过 vercel env）
vercel --prod
```

## 部署脚本

创建快捷部署脚本：

```bash
# deploy-web.sh
#!/bin/bash
set -e

cd apps/web

echo "🔍 检查环境变量..."
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo "❌ 未设置 NEXT_PUBLIC_API_URL"
  exit 1
fi

echo "🚀 部署到 Vercel..."
vercel --prod

echo "✅ 部署完成！"
```

## 对比：CLI vs Git 集成

| 特性       | CLI                | Git 集成 |
| ---------- | ------------------ | -------- |
| 部署方式   | 手动执行           | 自动触发 |
| 版本历史   | 较少               | 完整     |
| 团队协作   | 单人               | 多人     |
| CI/CD 集成 | 需配置             | 原生支持 |
| 适用场景   | 快速测试、临时部署 | 正式项目 |

## 推荐工作流

**开发阶段**：使用 CLI 快速测试

```bash
# 开发完成
pnpm build
vercel  # 预览部署
# 测试通过
vercel --prod  # 生产部署
```

**正式项目**：切换到 Git 集成

```bash
# 设置好 Git 集成后，只需
git push origin main
# Vercel 自动部署
```

---

**相关文档：**

- [Vercel 官方文档](https://vercel.com/docs/cli)
- [服务器部署指南](./README.md)
- [本地构建部署](./build-deploy.md)
