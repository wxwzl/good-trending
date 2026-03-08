import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const isProd = process.env.NODE_ENV === "production";

/**
 * 安全 Headers 配置
 * 包含 CSP、XSS 防护、点击劫持防护等
 */
const securityHeaders = [
  // X-Content-Type-Options: 防止 MIME 类型嗅探
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // X-Frame-Options: 防止点击劫持
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // X-XSS-Protection: XSS 过滤器 (现代浏览器已弃用，但仍为旧浏览器提供保护)
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Referrer-Policy: 控制 Referrer 信息
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions-Policy: 限制浏览器功能
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Strict-Transport-Security: 强制 HTTPS (生产环境)
  // 仅在生产环境启用，开发环境使用 HTTP
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
  // Content-Security-Policy: 内容安全策略
  {
    key: "Content-Security-Policy",
    value: [
      // 默认只允许同源资源
      "default-src 'self'",
      // 脚本来源：同源 + 内联脚本 (Next.js 需要)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // 样式来源：同源 + 内联样式 (Tailwind CSS 需要)
      "style-src 'self' 'unsafe-inline'",
      // 图片来源：允许所有来源 (商品图片等)
      "img-src 'self' data: https: blob:",
      // 字体来源：同源 + data URI
      "font-src 'self' data:",
      // 连接来源：允许 API 和外部数据
      "connect-src 'self' https:",
      // 框架来源：禁止嵌入
      "frame-src 'none'",
      // 对象来源：禁止 Flash 等插件
      "object-src 'none'",
      // 媒体来源：同源
      "media-src 'self'",
      // Worker 来源：同源
      "worker-src 'self' blob:",
      // 表单提交：只允许同源
      "form-action 'self'",
      // 基础 URI：只允许同源
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // cacheComponents: true,
  reactCompiler: true,
  // 开启 sourcemap 便于调试
  productionBrowserSourceMaps: isProd ? false : true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // API 代理配置 - 解决跨域问题
  rewrites: isProd
    ? undefined
    : async function rewrites() {
        const apiUrl = (process.env.API_URL || "http://localhost:3015").replace(/\/api\/v1$/, "");
        return [
          {
            // 匹配不带 locale 前缀的路径（优先匹配更具体的路径）
            source: "/backend/api/v1/:path*",
            destination: `${apiUrl}/api/v1/:path*`,
          },
        ];
      },
  // 安全 Headers 配置
  async headers() {
    return [
      {
        // 应用到所有路由
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
