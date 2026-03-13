#!/usr/bin/env node
/**
 * Scheduler 部署构建脚本
 * 构建产物部署到项目根目录下的 deploy/app/scheduler 目录
 * 环境变量配置文件放置到 deploy/ 目录
 * 日志输出到 deploy/app/scheduler/logs/ 目录
 */

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
const schedulerDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(__dirname, "../../..");
const deployDir = path.join(rootDir, "deploy");
const deployAppDir = path.join(deployDir, "app", "scheduler");
const deployLogsDir = path.join(deployAppDir, "logs");
const distDir = path.join(schedulerDir, "dist");

// 需要复制的环境变量文件
const envFilesToCopy = [".env", ".env.production", ".env.production.local", ".env.local"];

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
      cwd: schedulerDir,
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
  log("INFO", "开始 Scheduler 部署构建");
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

  // 4. 构建项目
  log("INFO", "开始构建项目...");
  if (!execCommand("node scripts/run.js build")) {
    log("ERROR", "构建失败");
    process.exit(1);
  }

  // 5. 检查 dist 输出
  log("INFO", "检查 dist 输出...");
  if (!fs.existsSync(distDir)) {
    log("ERROR", `未找到 dist 输出目录: ${distDir}`);
    process.exit(1);
  }

  // 6. 复制 dist 文件到部署目录
  log("INFO", "复制 dist 文件...");
  copyRecursive(distDir, path.join(deployAppDir, "dist"));

  // 7. 复制环境变量文件到 deploy 目录
  log("INFO", "复制环境变量文件...");
  for (const envFile of envFilesToCopy) {
    const src = path.join(rootDir, envFile);
    if (fs.existsSync(src)) {
      const dest = path.join(deployDir, envFile);
      fs.copyFileSync(src, dest);
      log("INFO", `复制环境文件: ${envFile}`);
    }
  }

  // 8. 创建 package.json（用于部署环境）
  log("INFO", "创建部署 package.json...");
  const originalPackageJson = JSON.parse(
    fs.readFileSync(path.join(schedulerDir, "package.json"), "utf-8")
  );

  // 过滤掉 workspace 依赖和开发依赖
  const deployDependencies = {};
  for (const [key, value] of Object.entries(originalPackageJson.dependencies || {})) {
    if (!value.includes("workspace:")) {
      deployDependencies[key] = value;
    }
  }

  const deployPackageJson = {
    name: originalPackageJson.name,
    version: originalPackageJson.version,
    private: true,
    type: "module",
    scripts: {
      start: "node dist/index.mjs",
      "start:log": "node scripts/deploy-server.js",
    },
    dependencies: deployDependencies,
  };
  fs.writeFileSync(
    path.join(deployAppDir, "package.json"),
    JSON.stringify(deployPackageJson, null, 2)
  );

  // 9. 复制部署脚本
  log("INFO", "复制部署脚本...");
  const scriptsDir = path.join(deployAppDir, "scripts");
  ensureDir(scriptsDir);
  fs.copyFileSync(
    path.join(__dirname, "deploy-server.js"),
    path.join(scriptsDir, "deploy-server.js")
  );

  // 10. 创建启动说明文件
  log("INFO", "创建部署说明...");
  const readmeContent = `# Scheduler 部署包

## 目录结构

\`\`\`
deploy/
├── .env                    # 环境变量配置
├── .env.production         # 生产环境配置
├── app/scheduler/
│   ├── dist/              # tsup 构建产物
│   ├── logs/              # 日志目录
│   ├── scripts/           # 启动脚本
│   └── package.json       # 部署包配置
\`\`\`

## 启动方式

### 方式 1：直接启动（推荐）

\`\`\`bash
cd deploy/app/scheduler
pnpm install --production
node dist/index.mjs
\`\`\`

### 方式 2：使用带日志的启动脚本

\`\`\`bash
cd deploy/app/scheduler
pnpm install --production
node scripts/deploy-server.js
\`\`\`

日志将输出到 logs/ 目录：
- logs/app-YYYY-MM-DD.log: 应用日志
- logs/error-YYYY-MM-DD.log: 错误日志

### 方式 3：使用 PM2 管理进程（生产推荐）

\`\`\`bash
cd deploy/app/scheduler
pnpm install --production
pm2 start dist/index.mjs --name "scheduler-service"
pm2 save
pm2 startup
\`\`\`

## 环境变量

必需的环境变量：
- DATABASE_URL: PostgreSQL 数据库连接字符串
- REDIS_URL: Redis 连接字符串
- SCHEDULER_PORT: 调度器服务端口（默认 3017）

可选的环境变量：
- CRAWL_SCHEDULE: 爬虫调度 cron 表达式（默认 \\"0 */6 * * *\\"）
- NODE_ENV: 运行环境（默认 production）

## 注意事项

1. 部署包不包含源码，只包含构建产物
2. 需要 Node.js >= 20.0.0
3. 需要 PostgreSQL 和 Redis 服务
4. 建议使用 PM2 或 systemd 管理进程
5. 日志文件会自动增长，建议配置 logrotate
`;
  fs.writeFileSync(path.join(deployAppDir, "README.md"), readmeContent);

  // 11. 创建 .gitignore
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
  fs.writeFileSync(path.join(deployAppDir, ".gitignore"), gitignoreContent);

  // 12. 验证部署包
  log("INFO", "验证部署包...");
  const indexPath = path.join(deployAppDir, "dist/index.js");
  const indexMjsPath = path.join(deployAppDir, "dist/index.mjs");
  if (!fs.existsSync(indexPath) && !fs.existsSync(indexMjsPath)) {
    log("ERROR", `部署包缺少必需文件: dist/index.js 或 dist/index.mjs`);
    process.exit(1);
  }

  // 13. 计算部署包大小
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

    const sizeInBytes = getFolderSize(deployAppDir);
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
    log("INFO", `部署包大小: ${sizeInMB} MB (${sizeInBytes} bytes)`);
  } catch (e) {
    log("WARN", `无法计算部署包大小: ${e.message}`);
  }

  log("SUCCESS", "=====================================");
  log("SUCCESS", "Scheduler 部署构建完成！");
  log("SUCCESS", "=====================================");
  log("INFO", `部署目录: ${deployDir}`);
  log("INFO", `应用目录: ${deployAppDir}`);
  log("INFO", `日志目录: ${deployLogsDir}`);
  log("INFO", "");
  log("INFO", "启动方式:");
  log("INFO", `  cd ${deployAppDir}`);
  log("INFO", "  pnpm install --production");
  log("INFO", "  node dist/index.mjs");
  log("INFO", "");
  log("INFO", "或使用带日志的启动方式:");
  log("INFO", "  node scripts/deploy-server.js");
}

main().catch((error) => {
  log("ERROR", `部署构建失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
