# Vercel 预构建部署指南

在 Next.js 中实现"只部署构建产物而不上传源码"到 Vercel，主要依赖于 Vercel CLI 提供的 `vercel build` 和 `vercel deploy --prebuilt` 指令。这种方式会将源码留在本地或 CI 环境中，仅将编译后的 `.vercel/output`（符合 Vercel Build Output API 标准的产物）上传。

---

## 实现步骤

### 1. 安装 Vercel CLI

首先确保你安装了最新版本的 Vercel CLI：

```bash
npm install -g vercel
```

### 2. 链接项目 (仅需一次)

在项目根目录运行以下命令，将本地目录与 Vercel 上的项目进行关联。如果你还没有项目，它会引导你创建一个。

```bash
vercel link
```

运行后，本地会生成一个 `.vercel` 文件夹，记录了 `projectId` 和 `orgId`。

### 3. 本地构建 (关键步骤)

不要使用 `npm run build`，而是使用 Vercel CLI 的构建命令。它会调用 Next.js 的构建能力，并按照 Vercel 云端运行环境的要求生成标准产物。

```bash
vercel build --prod
```

**原理**：该命令会在本地生成一个 `.vercel/output` 文件夹。这里面包含了所有的静态资源、Serverless 函数代码以及路由配置，但不包含你的原始 `.ts` 或 `.js` 源码。

### 4. 部署构建产物

使用 `--prebuilt` 参数，告诉 Vercel 直接使用上一步生成的 `.vercel/output` 进行部署，跳过云端的编译过程。

```bash
vercel deploy --prebuilt --prod
```

- `--prebuilt`: 核心参数，强制 Vercel 仅上传产物
- `--prod`: 发布到生产环境（如果不加，则发布到 Preview 环境）

---

## 为什么这样做？

### 优点说明

| 优点 | 说明 |
|------|------|
| **源码隐私** | Vercel 服务器上完全不接触你的源代码 |
| **构建环境一致性** | 可以在你自己的 CI (如 GitHub Actions, GitLab CI) 或本地完成构建，避免 Vercel 编译环境与本地不一致的问题 |
| **节省 Vercel 额度** | 消耗的是你自己的 CPU 进行构建，不占用 Vercel 的 Build Minutes（对于大型项目可节省费用） |
| **突破限制** | 如果构建过程需要访问 Vercel 环境无法访问的内网资源，可以在本地构建完成后再推送到 Vercel |

---

## 快速部署命令（本项目已配置）

本项目已配置一键部署脚本，执行以下命令即可：

```bash
# 方式 1：完整流程（build + deploy）
cd apps/web
pnpm run deploy:vercel

# 方式 2：仅构建产物
cd apps/web
pnpm run vercel:build

# 方式 3：仅部署（前提是已构建）
cd apps/web
pnpm run vercel:deploy
```

---

## 在 CI/CD (如 GitHub Actions) 中的应用示例

如果你想在 GitHub Actions 中实现这个流程，可以参考以下配置：

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build Project
        run: |
          npm install -g vercel
          vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 注意事项

1. **环境变量同步**：确保在 `vercel build` 之前运行 `vercel pull`，以同步 Vercel 上的环境变量到本地，否则构建可能会因为缺少环境变量而失败

2. **源码不可见**：这种方式部署后，Vercel 控制台的 "Source" 选项卡将看不到源码，只能看到部署的产物结构

3. **构建产物体积**：
   - Vercel Serverless Function 有 250MB（压缩后）的大小限制
   - 如果构建产物过大，考虑优化依赖或使用 Docker 部署到其他平台

4. **Vercel 免费版限制**：
   - 上传文件大小限制：100MB
   - 如果需要包含 `node_modules`，可能超出限制
   - 解决方案：使用 `vercel build` 而不是手动组装 `.vercel/output`

---

## 故障排查

### 问题："The Next.js output directory '.next' was not found"

**原因**：`vercel build` 未执行或执行失败

**解决**：
```bash
# 确保在正确目录执行
vercel build --prod

# 检查 .vercel/output 是否生成
ls -la .vercel/output/
```

### 问题："File size limit exceeded (100 MB)"

**原因**：包含 `node_modules` 后超出免费版限制

**解决**：
```bash
# 使用 vercel build 自动生成，它会智能处理依赖
vercel build --prod

# 不要手动复制 node_modules 到 .vercel/output
```

### 问题："Cannot find module 'next'"

**原因**：Serverless 函数缺少运行时依赖

**解决**：确保 `vercel build` 正确执行，它会自动处理依赖关系

---

## 替代方案

如果 Vercel 的限制不适合你的项目，可以考虑：

| 平台 | 免费额度 | 特点 |
|------|---------|------|
| **Railway** | $5/月 | 直接运行 Node.js，无 Serverless 限制 |
| **Render** | 永久免费 | 支持 Docker，但有休眠机制 |
| **Fly.io** | $5/月 | 全球边缘部署 |

---

## 参考

- [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
