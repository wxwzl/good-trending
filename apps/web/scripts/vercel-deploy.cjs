#!/usr/bin/env node
/**
 * Vercel 预构建部署脚本
 * 使用 vercel build + vercel deploy --prebuilt 实现只部署构建产物
 * 源码不会上传到 Vercel 服务器
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
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(__dirname, "../../..");

// 执行命令
function execCommand(command, options = {}) {
  log("INFO", `执行命令: ${command}`);
  try {
    execSync(command, {
      stdio: "inherit",
      cwd: webDir,
      env: {
        ...process.env,
        // 禁用 Turbopack 以避免 monorepo 路径问题
        NEXT_DISABLE_TURBOPACK: "1",
        TURBOPACK: "false",
      },
      ...options,
    });
    return true;
  } catch (error) {
    log("ERROR", `命令执行失败: ${error.message}`);
    return false;
  }
}

// 检查 vercel CLI
function checkVercelCLI() {
  try {
    execSync("vercel --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// 检查是否已链接项目
function checkVercelLink() {
  const vercelDir = path.join(webDir, ".vercel");
  return fs.existsSync(vercelDir);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "deploy"; // build | deploy | full

  log("INFO", "=====================================");
  log("INFO", "Vercel 预构建部署");
  log("INFO", "=====================================");

  // 1. 检查 vercel CLI
  if (!checkVercelCLI()) {
    log("ERROR", "未找到 Vercel CLI，请先安装:");
    log("INFO", "  npm install -g vercel");
    process.exit(1);
  }
  log("SUCCESS", "Vercel CLI 已安装");

  // 2. 检查是否已链接项目
  if (!checkVercelLink()) {
    log("WARN", "未找到 Vercel 项目链接");
    log("INFO", "请先运行: vercel link");
    log("INFO", "");
    log("INFO", "这将引导你完成项目链接或创建新项目");

    if (!execCommand("vercel link")) {
      log("ERROR", "项目链接失败");
      process.exit(1);
    }
  } else {
    log("SUCCESS", "Vercel 项目已链接");
  }

  // 3. 根据命令执行不同操作
  switch (command) {
    case "build":
      // 仅构建 - 使用 next build 生成 standalone 输出，然后创建 Vercel 结构
      log("INFO", "开始本地构建...");

      // 运行 next build
      if (!execCommand("pnpm run build")) {
        log("ERROR", "构建失败");
        process.exit(1);
      }

      // 创建 Vercel Build Output API 结构
      log("INFO", "创建 Vercel Build Output API 结构...");
      if (!execCommand("node scripts/create-vercel-output.cjs")) {
        log("ERROR", "创建输出结构失败");
        process.exit(1);
      }

      log("SUCCESS", "构建完成！产物位于 .vercel/output/");
      break;

    case "deploy":
      // 仅部署（假设已构建）
      if (!fs.existsSync(path.join(webDir, ".vercel", "output"))) {
        log("ERROR", "未找到构建产物，请先运行: pnpm run vercel:build");
        process.exit(1);
      }

      log("INFO", "开始部署预构建产物...");
      if (!execCommand("vercel deploy --prebuilt --prod")) {
        log("ERROR", "部署失败");
        process.exit(1);
      }
      log("SUCCESS", "部署完成！");
      break;

    case "full":
    default:
      // 完整流程：构建 + 部署
      log("INFO", "步骤 1/2: 本地构建...");
      if (!execCommand("vercel build --prod")) {
        log("ERROR", "构建失败");
        process.exit(1);
      }
      log("SUCCESS", "构建完成！");

      log("INFO", "");
      log("INFO", "步骤 2/2: 部署到 Vercel...");
      if (!execCommand("vercel deploy --prebuilt --prod")) {
        log("ERROR", "部署失败");
        process.exit(1);
      }
      log("SUCCESS", "部署完成！");
      break;
  }

  log("INFO", "");
  log("SUCCESS", "=====================================");
  log("SUCCESS", command === "build" ? "构建完成！" : command === "deploy" ? "部署完成！" : "全流程完成！");
  log("SUCCESS", "=====================================");

  if (command !== "build") {
    log("INFO", "");
    log("INFO", "查看部署:");
    log("INFO", "  vercel --version");
    log("INFO", "");
    log("INFO", "查看日志:");
    log("INFO", "  vercel logs <deployment-url>");
  }
}

main().catch((error) => {
  log("ERROR", `部署失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
