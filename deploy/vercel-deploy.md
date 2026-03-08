# Web 前端 Vercel 部署指南

> 将 Next.js 前端部署到 Vercel，实现服务器零负担

## 为什么用 Vercel？

| 特性             | 说明                                                |
| ---------------- | --------------------------------------------------- |
| **免费托管**     | Hobby 计划完全免费，足够个人/小项目使用             |
| **全球 CDN**     | 自动部署到全球边缘节点，访问速度快                  |
| **自动部署**     | 代码推送到 GitHub 自动触发部署                      |
| **零运维**       | 无需管理服务器，自动扩缩容                          |
| **Next.js 优化** | 原生支持 Next.js 所有特性（SSR、ISR、Image 优化等） |

## 部署步骤

### 1. 准备工作

**确保 API 已部署到公网服务器**

Vercel 托管的 Web 前端需要访问你的 API 服务器：

```
Web (Vercel) ──HTTP──> API (你的服务器:3015)
```

API 服务器需要：

- 有公网 IP 或域名
- 配置 CORS 允许 Vercel 域名访问
- 使用 HTTPS（生产环境推荐）

### 2. 安装 Vercel CLI

```bash
npm install -g vercel

# 登录
vercel login
# 会打开浏览器让你授权 GitHub 账号
```

### 3. 配置项目

**方式一：使用 Vercel CLI 部署（推荐首次使用）**

```bash
# 进入 web 目录
cd apps/web

# 部署（开发预览）
vercel

# 部署到生产环境
vercel --prod
```

**方式二：GitHub 集成（推荐长期使用）**

1. 推送代码到 GitHub
2. 访问 https://vercel.com/new
3. 选择你的 GitHub 仓库
4. Vercel 自动检测 Next.js 项目

### 4. 配置环境变量

在 Vercel Dashboard 中设置：

```
Project Settings > Environment Variables
```

| 变量名                | 值                                  | 环境        |
| --------------------- | ----------------------------------- | ----------- |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api/v1` | Production  |
| `NEXT_PUBLIC_API_URL` | `http://your-server-ip:3015/api/v1` | Development |

> ⚠️ **重要**：必须以 `NEXT_PUBLIC_` 开头，才能在客户端访问

### 5. 配置 next.config.ts

确保 API 地址使用环境变量：

```typescript
// apps/web/next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Vercel 会自动优化，不需要 standalone
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // 确保使用环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default withNextIntl(nextConfig);
```

### 6. 配置 API CORS

在 API 服务器上允许 Vercel 域名访问：

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    // 本地开发
    "http://localhost:3010",
    // Vercel 预览部署
    /\.vercel\.app$/,
    // Vercel 生产部署（自定义域名）
    "https://yourdomain.com",
    "https://www.yourdomain.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
```

### 7. 自定义域名（可选）

**添加域名：**

1. Vercel Dashboard → Project Settings → Domains
2. 输入你的域名，如 `www.yourdomain.com`
3. 按提示配置 DNS CNAME 记录

```
# DNS 配置示例
CNAME www.yourdomain.com >> cname.vercel-dns.com
```

### 8. 验证部署

```bash
# 访问你的 Vercel 域名
curl https://your-app.vercel.app

# 检查 API 连接是否正常
# 打开浏览器开发者工具，查看 Network 面板
```

## 费用说明

| 计划           | 价格   | 包含                     | 适用场景             |
| -------------- | ------ | ------------------------ | -------------------- |
| **Hobby**      | 免费   | 100GB 带宽/月，无限部署  | 个人项目、小流量网站 |
| **Pro**        | $20/月 | 1TB 带宽，团队协作，分析 | 商业项目、团队使用   |
| **Enterprise** | 定制   | 更多资源，SLA 保障       | 大型企业             |

**免费版限制：**

- 函数执行时间：10s（Hobby）/ 60s（Pro）
- 构建时间：45分钟
- 团队人数：1人

对于 Good-Trending 项目，**免费版完全够用**。

## 常见问题

### Q1: Vercel 部署后 API 请求失败？

检查以下几点：

1. **环境变量是否正确设置**

   ```bash
   # 在 Vercel Dashboard 检查
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
   ```

2. **API 是否允许跨域**

   ```typescript
   // API 的 CORS 配置是否包含 Vercel 域名
   origin: ["https://your-app.vercel.app"];
   ```

3. **API 是否使用 HTTPS**
   ```
   // 浏览器要求 HTTPS 页面只能请求 HTTPS API
   https://your-app.vercel.app >> https://api.yourdomain.com ✓
   https://your-app.vercel.app >> http://api.server.com ✗
   ```

### Q2: 如何查看 Vercel 部署日志？

```bash
# CLI 查看
vercel logs your-app.vercel.app

# 或在 Dashboard > Deployments > 点击部署记录查看
```

### Q3: 如何回滚到上一个版本？

```bash
# CLI 回滚
vercel --version  # 查看历史版本
vercel rollback   # 回滚到上一个版本

# 或在 Dashboard > Deployments > 点击"..."> Promote to Production
```

### Q4: 静态资源加载慢？

Vercel 默认使用全球 CDN，如果慢可能是：

1. 图片太大 → 使用 Next.js Image 组件自动优化
2. API 响应慢 → 优化服务器或开启缓存
3. 网络问题 → 检查用户所在地区

## 部署架构

```
用户访问
    │
    ▼
┌─────────────────┐
│  Vercel Edge    │  全球 CDN 节点
│  (Next.js Web)  │  静态资源 + SSR
└─────────────────┘
    │
    │ HTTP/HTTPS
    ▼
┌─────────────────┐
│  你的服务器      │  2GB 内存
│  (NestJS API)   │  运行 API + Scheduler
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  PostgreSQL     │
│  Redis          │
└─────────────────┘
```

## 相关命令

```bash
# 本地预览生产构建
cd apps/web
pnpm build
pnpm start

# 部署到 Vercel 预览环境
vercel

# 部署到生产环境
vercel --prod

# 查看部署列表
vercel list

# 查看日志
vercel logs

# 删除部署
vercel remove
```

---

**下一步：** 配置服务器端 PM2 部署 → [服务器部署指南](./README.md)
