# Vercel 部署指南（Standalone 模式）

本文档说明如何将 Next.js standalone 构建产物部署到 Vercel，无需暴露源码。

## 文件说明

- `index.js` - Vercel Serverless 适配器入口
- `vercel.json` - Vercel 部署配置
- `scripts/prepare-for-vercel.js` - 部署前检查脚本

## 部署步骤

### 1. 首次部署前准备

```bash
cd deploy/app/web

# 链接 Vercel 项目（首次需要）
vercel link

# 按提示选择或创建项目
```

### 2. 运行准备脚本

```bash
node scripts/prepare-for-vercel.js
```

此脚本会检查：
- 必要文件是否完整
- 依赖是否安装
- 包大小是否合理

### 3. 部署到 Vercel

```bash
# 预览部署
vercel

# 生产部署
vercel --prebuilt --archive=tgz --prod   # 或者压缩包上传vercel  --archive=tgz --prod  --force//清除缓存
```

## 项目结构要求

```
deploy/app/web/
├── .next/                    # Next.js 构建产物
│   ├── server/               # 服务端代码
│   ├── static/               # 静态资源
│   ├── required-server-files.json
│   └── ...
├── public/                   # 公共资源（可选）
├── node_modules/             # 依赖
├── index.js                  # Vercel 适配器入口 ✅ 已创建
├── vercel.json               # Vercel 配置 ✅ 已创建
└── package.json              # 依赖配置
```

## 环境变量

如需设置环境变量，使用 Vercel CLI：

```bash
# 设置环境变量
vercel env add API_URL
vercel env add DATABASE_URL

# 或者直接在 Vercel Dashboard 中设置
```

## 注意事项

### 1. 包大小限制

Vercel Serverless Function 有大小限制：
- 压缩后最大 **250MB**
- 包含 `node_modules` + `.next` 目录

如果超出限制：
- 使用 `output: 'export'` 转为静态导出
- 或迁移到 Docker 部署（Railway, Render, Fly.io）

### 2. Cold Start

Serverless 有冷启动时间，对于：
- 小型项目：通常 < 1s
- 大型项目：可能 2-5s

如需更稳定性能，考虑：
- Vercel Pro 的 Edge Functions
- 或专用服务器部署

### 3. 静态资源缓存

已配置的缓存策略：
- `/_next/static/*` - 1 年长期缓存（immutable）
- 页面路由 - 由 Next.js 控制

### 4. 图片优化

Next.js Image 组件需要额外配置。如需使用：
- 确保在 `next.config.js` 中配置了 `images.domains`
- 或使用 Vercel 的 Edge Network

## 故障排查

### 部署失败 "Function size exceeds limit"

```bash
# 查看包大小
npm install -g vercel
vercel inspect <deployment-url>

# 优化方案：只安装必要依赖
rm -rf node_modules
npm install --production
```

### 运行时错误 "Cannot find module"

```bash
# 确保所有依赖都在 dependencies 中，而非 devDependencies
# 检查 package.json
cat package.json

# 重新安装
npm install
```

### 页面 404

```bash
# 检查 .next/server/app 是否存在页面文件
ls -la .next/server/app/

# 确保构建时包含了目标路由
```

## 替代方案对比

| 平台 | 部署方式 | 适合场景 |
|------|---------|---------|
| **Vercel** | Serverless | SEO 要求、Serverless 生态 |
| **Railway** | Docker/容器 | 简单部署、低流量 |
| **Render** | Docker/容器 | 性价比高 |
| **Fly.io** | Docker | 全球分布、边缘部署 |
| **AWS ECS** | Docker | 企业级、高可用 |

## 迁移到 Docker（备选）

如果 Vercel 限制太多，可以使用 Docker：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY .next ./.next
COPY public ./public
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
```

部署到 Railway/Render/Fly.io 即可。
