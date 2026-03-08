#!/usr/bin/env node
/**
 * Web 部署构建脚本
 * 构建产物部署到项目根目录下的 deploy/app/web 目录
 * 环境变量配置文件放置到 deploy/ 目录
 * 日志输出到 deploy/app/web/logs/ 目录
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
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

// 路径配置
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(__dirname, "../../..");
const deployDir = path.join(rootDir, "deploy");
const deployAppDir = path.join(deployDir, "app", "web");
const deployLogsDir = path.join(deployAppDir, "logs");
const standaloneDir = path.join(webDir, ".next", "standalone", "apps", "web");

// 需要复制的环境变量文件
const envFilesToCopy = [
  ".env",
  ".env.production",
  ".env.production.local",
  ".env.local",
];

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log("INFO", `创建目录: ${dir}`);
  }
}

// 清空目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
    log("INFO", `清空目录: ${dir}`);
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

// 执行命令
function execCommand(command, options = {}) {
  log("INFO", `执行命令: ${command}`);
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: webDir,
      ...options,
    });
    return true;
  } catch (error) {
    log("ERROR", `命令执行失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  log("INFO", "=====================================");
  log("INFO", "开始 Web 部署构建");
  log("INFO", "=====================================");

  // 1. 检查环境
  log("INFO", "检查环境...");
  if (!fs.existsSync(path.join(rootDir, "package.json"))) {
    log("ERROR", "未找到 package.json，请确保在项目根目录运行");
    process.exit(1);
  }

  // 2. 创建部署目录
  log("INFO", "创建部署目录...");
  ensureDir(deployDir);
  ensureDir(deployAppDir);
  ensureDir(deployLogsDir);

  // 3. 清空旧的部署文件
  log("INFO", "清理旧的部署文件...");
  cleanDir(deployAppDir);
  ensureDir(deployAppDir);
  ensureDir(deployLogsDir);

  // 4. 构建项目（使用开发环境配置，避免构建时依赖生产 API）
  log("INFO", "开始构建项目...");
  log("INFO", "注意：构建时使用开发环境配置，部署时加载生产环境配置");

  // 构建时强制使用开发环境，避免 generateStaticParams 调用生产 API
  // 直接使用 node 运行 run.js，避免 cross-env 覆盖环境变量
  const buildEnv = {
    ...process.env,
    NODE_ENV: "production",
  };

  log("INFO", `构建环境: NODE_ENV=${buildEnv.NODE_ENV}, APP_ENV=${buildEnv.APP_ENV}`);

  if (!execCommand("node scripts/run.js build", { env: buildEnv })) {
    log("ERROR", "构建失败");
    process.exit(1);
  }

  // 5. 检查 standalone 输出
  log("INFO", "检查 standalone 输出...");
  if (!fs.existsSync(standaloneDir)) {
    log("ERROR", `未找到 standalone 输出目录: ${standaloneDir}`);
    log("ERROR", "请确保 next.config.ts 中设置了 output: 'standalone'");
    process.exit(1);
  }

  // 6. 复制 standalone 文件到部署目录
  log("INFO", "复制 standalone 文件...");
  const filesToCopy = fs.readdirSync(standaloneDir);
  for (const file of filesToCopy) {
    const src = path.join(standaloneDir, file);
    const dest = path.join(deployAppDir, file);
    copyRecursive(src, dest);
    log("INFO", `复制: ${file}`);
  }

  // 7. 复制 public 目录（如果有）
  const publicDir = path.join(webDir, "public");
  if (fs.existsSync(publicDir)) {
    log("INFO", "复制 public 目录...");
    const publicDest = path.join(deployAppDir, "public");
    copyRecursive(publicDir, publicDest);
  }

  // 8. 复制 static 文件
  const staticSrc = path.join(webDir, ".next", "static");
  const staticDest = path.join(deployAppDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    log("INFO", "复制 static 文件...");
    copyRecursive(staticSrc, staticDest);
  }

  // 9. 复制环境变量文件到 deploy 目录
  log("INFO", "复制环境变量文件...");
  for (const envFile of envFilesToCopy) {
    const src = path.join(rootDir, envFile);
    if (fs.existsSync(src)) {
      const dest = path.join(deployDir, envFile);
      fs.copyFileSync(src, dest);
      log("INFO", `复制环境文件: ${envFile}`);
    }
  }

  // 10. 创建 package.json（用于部署环境）
  log("INFO", "创建部署 package.json...");
  const originalPackageJson = JSON.parse(
    fs.readFileSync(path.join(webDir, "package.json"), "utf-8")
  );

  // 过滤掉 workspace:* 依赖，因为 standalone 模式已经包含所有必要依赖
  const deployDependencies = {};
  for (const [key, value] of Object.entries(originalPackageJson.dependencies || {})) {
    if (!value.includes("workspace:")) {
      deployDependencies[key] = value;
    }
  }

  // standalone 模式下只需要 next 依赖用于启动服务器
  const deployPackageJson = {
    name: originalPackageJson.name,
    version: originalPackageJson.version,
    private: true,
    type: "commonjs",
    scripts: {
      start: "node server.js",
      "start:log": "node scripts/deploy-server.js",
    },
    // standalone 模式下，大部分依赖已经在 standalone/node_modules 中
    // 只需要保留生产环境必需的依赖
    dependencies: {
      "dotenv": deployDependencies["dotenv"] || "^16.6.1",
    },
  };
  fs.writeFileSync(
    path.join(deployAppDir, "package.json"),
    JSON.stringify(deployPackageJson, null, 2)
  );

  // 11. 复制部署脚本
  log("INFO", "复制部署脚本...");
  const scriptsDir = path.join(deployAppDir, "scripts");
  ensureDir(scriptsDir);
  fs.copyFileSync(
    path.join(__dirname, "deploy-server.js"),
    path.join(scriptsDir, "deploy-server.js")
  );

  // 12. 创建启动说明文件
  log("INFO", "创建部署说明...");
  const readmeContent = `# Web 部署包

## 目录结构

\`\`\`
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
\`\`\`

## 启动方式

### 方式 1：使用内置服务器（推荐）

\`\`\`bash
cd deploy/app/web
pnpm install --production
node server.js
\`\`\`

环境变量配置：
- PORT: 服务端口（默认 3010）
- HOSTNAME: 服务主机（默认 0.0.0.0）

### 方式 2：使用带日志的启动脚本

\`\`\`bash
cd deploy/app/web
pnpm install --production
node scripts/deploy-server.js
\`\`\`

日志将输出到 logs/ 目录：
- logs/app-YYYY-MM-DD.log: 应用日志
- logs/error-YYYY-MM-DD.log: 错误日志

### 方式 3：使用环境变量指定配置

\`\`\`bash
cd deploy/app/web
export PORT=8080
export HOSTNAME=0.0.0.0
export LOGS_DIR=/var/log/web
node scripts/deploy-server.js
\`\`\`

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
`;
  fs.writeFileSync(path.join(deployDir, "README.md"), readmeContent);

  // 13. 创建 .gitignore
  const gitignoreContent = `# 部署包日志文件
logs/
*.log

# 本地环境文件
.env.local
.env.production.local

# Node modules
node_modules/

# 临时文件
*.tmp
*.temp
`;
  fs.writeFileSync(path.join(deployDir, ".gitignore"), gitignoreContent);

  // 14. 验证部署包
  log("INFO", "验证部署包...");
  const requiredFiles = ["server.js", "package.json", ".next"];
  for (const file of requiredFiles) {
    const filePath = path.join(deployAppDir, file);
    if (!fs.existsSync(filePath)) {
      log("ERROR", `部署包缺少必需文件: ${file}`);
      process.exit(1);
    }
  }

  // 15. 计算部署包大小
  log("INFO", "计算部署包大小...");
  try {
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

    const sizeInBytes = getFolderSize(deployDir);
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
    log("INFO", `部署包大小: ${sizeInMB} MB (${sizeInBytes} bytes)`);
  } catch (e) {
    log("WARN", `无法计算部署包大小: ${e.message}`);
  }

  log("SUCCESS", "=====================================");
  log("SUCCESS", "部署构建完成！");
  log("SUCCESS", "=====================================");
  log("INFO", `部署目录: ${deployDir}`);
  log("INFO", `应用目录: ${deployAppDir}`);
  log("INFO", `日志目录: ${deployLogsDir}`);
  log("INFO", "");
  log("INFO", "启动方式:");
  log("INFO", `  cd ${deployAppDir}`);
  log("INFO", "  pnpm install --production");
  log("INFO", "  node server.js");
  log("INFO", "");
  log("INFO", "或使用带日志的启动方式:");
  log("INFO", "  node scripts/deploy-server.js");
}

main().catch((error) => {
  log("ERROR", `部署构建失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
