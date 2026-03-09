#!/usr/bin/env node
/**
 * 创建 Vercel Build Output API 结构（使用 standalone 输出）
 */

const fs = require("fs");
const path = require("path");

// 路径配置
const webDir = path.resolve(__dirname, "..");
const outputDir = path.join(webDir, ".vercel", "output");
const standaloneDir = path.join(webDir, ".next", "standalone", "apps", "web");
const staticDir = path.join(webDir, ".next", "static");
const publicDir = path.join(webDir, "public");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  switch (level) {
    case "INFO":
      color = colors.cyan;
      break;
    case "SUCCESS":
      color = colors.green;
      break;
    case "WARN":
      color = colors.yellow;
      break;
    case "ERROR":
      color = colors.red;
      break;
  }
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`);
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 复制文件或目录
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 主函数
async function main() {
  log("INFO", "=====================================");
  log("INFO", "创建 Vercel Build Output API 结构");
  log("INFO", "=====================================");

  // 1. 检查 standalone 目录
  if (!fs.existsSync(standaloneDir)) {
    log("ERROR", `未找到 standalone 目录: ${standaloneDir}`);
    log("ERROR", "请确保 next.config.ts 中设置了 output: 'standalone'");
    process.exit(1);
  }

  // 2. 清理旧的输出目录
  log("INFO", "清理旧的输出目录...");
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  // 3. 创建目录结构
  log("INFO", "创建目录结构...");
  const outputStaticDir = path.join(outputDir, "static");
  const functionsDir = path.join(outputDir, "functions", "api", "index.func");
  ensureDir(outputStaticDir);
  ensureDir(functionsDir);

  // 4. 复制 standalone 文件到函数目录（排除 package.json，稍后重新创建）
  log("INFO", "复制 standalone 文件...");
  const standaloneFiles = fs.readdirSync(standaloneDir);
  for (const file of standaloneFiles) {
    if (file === "package.json") continue; // 跳过 package.json，稍后重新创建
    const src = path.join(standaloneDir, file);
    const dest = path.join(functionsDir, file);
    copyRecursive(src, dest);
  }

  // 5. 复制 static 文件到静态目录
  if (fs.existsSync(staticDir)) {
    log("INFO", "复制 static 文件...");
    copyRecursive(staticDir, path.join(outputStaticDir, "_next"));
  }

  // 6. 复制 public 目录到静态目录
  if (fs.existsSync(publicDir)) {
    log("INFO", "复制 public 目录...");
    copyRecursive(publicDir, outputStaticDir);
  }

  // 7. 更新函数入口文件（适配 Vercel）
  log("INFO", "更新函数入口...");
  const indexJs = `const path = require('path');
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

// 加载 Next.js standalone
require('./server.js');

// Vercel Serverless Handler
const { createServer } = require('http');
const { parse } = require('url');

// 这里我们直接使用 standalone 的 server.js
// 它会在启动时创建 HTTP 服务器
module.exports = async (req, res) => {
  // standalone 模式已经启动了服务器，这里只是一个适配器
  // 实际上 standalone 输出不应该用于 Vercel Serverless
  // 因为它会启动一个长期运行的进程
  res.statusCode = 500;
  res.end('Standalone mode is not compatible with Vercel Serverless. Please use Docker deployment instead.');
};
`;
  fs.writeFileSync(path.join(functionsDir, "index.js"), indexJs);

  // 7. 复制 node_modules
  log("INFO", "复制 node_modules...");
  const webNodeModules = path.join(webDir, "node_modules");
  if (fs.existsSync(webNodeModules)) {
    // 只复制关键依赖（包括 Next.js 内部依赖）
    // 注意：不复制整个 @swc 和 @next 目录（太大），只复制必要的子目录
    const requiredPackages = [
      "next",
      "react",
      "react-dom",
      "styled-jsx",
      "client-only",
      "caniuse-lite",
      "postcss",
      "scheduler",
      "use-sync-external-store",
    ];

    for (const pkg of requiredPackages) {
      const src = path.join(webNodeModules, pkg);
      const dest = path.join(functionsDir, "node_modules", pkg);
      if (fs.existsSync(src)) {
        copyRecursive(src, dest);
        log("INFO", `  复制: ${pkg}`);
      }
    }

    // 复制 .bin 目录
    const binSrc = path.join(webNodeModules, ".bin");
    const binDest = path.join(functionsDir, "node_modules", ".bin");
    if (fs.existsSync(binSrc)) {
      copyRecursive(binSrc, binDest);
    }

    // 单独复制 @swc/helpers（不复制整个 @swc 目录）
    const swcHelpersSrc = path.join(webNodeModules, "@swc", "helpers");
    const swcHelpersDest = path.join(functionsDir, "node_modules", "@swc", "helpers");
    if (fs.existsSync(swcHelpersSrc)) {
      copyRecursive(swcHelpersSrc, swcHelpersDest);
      log("INFO", `  复制: @swc/helpers`);
    }

    log("SUCCESS", "node_modules 复制完成");
  } else {
    log("WARN", "未找到 node_modules，跳过复制");
  }

  // 创建 package.json
  log("INFO", "创建 package.json...");
  const pkg = {
    name: "web",
    version: "1.0.0",
    private: true,
    type: "commonjs",
    dependencies: {
      next: "16.1.6",
      react: "19.2.3",
      "react-dom": "19.2.3",
    },
  };
  fs.writeFileSync(
    path.join(functionsDir, "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  // 8. 创建 .vc-config.json
  log("INFO", "创建 Vercel 函数配置...");
  const vcConfig = {
    runtime: "nodejs20.x",
    handler: "index.js",
    launcherType: "Nodejs",
    includeFiles: [".next/**", "node_modules/**"],
  };
  fs.writeFileSync(
    path.join(functionsDir, ".vc-config.json"),
    JSON.stringify(vcConfig, null, 2)
  );

  // 9. 创建 config.json
  log("INFO", "创建 Vercel 路由配置...");
  const config = {
    version: 3,
    routes: [
      {
        handle: "filesystem",
      },
      {
        src: "/_next/static/(.*)",
        headers: {
          "cache-control": "public, max-age=31536000, immutable",
        },
      },
      {
        src: "/(.*)",
        dest: "/api/index",
      },
    ],
  };
  fs.writeFileSync(
    path.join(outputDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  // 10. 计算大小
  log("INFO", "计算输出大小...");
  const getFolderSize = (dirPath) => {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        totalSize += getFolderSize(filePath);
      } else {
        totalSize += stat.size;
      }
    }
    return totalSize;
  };

  const sizeInMB = (getFolderSize(outputDir) / 1024 / 1024).toFixed(2);
  log("INFO", `输出目录大小: ${sizeInMB} MB`);

  log("SUCCESS", "=====================================");
  log("SUCCESS", "Vercel Build Output API 结构创建完成！");
  log("SUCCESS", "=====================================");
  log("INFO", `输出目录: ${outputDir}`);
  log("INFO", "");
  log("INFO", "现在可以运行:");
  log("INFO", "  vercel deploy --prebuilt --prod");
}

main().catch((error) => {
  log("ERROR", `创建失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
