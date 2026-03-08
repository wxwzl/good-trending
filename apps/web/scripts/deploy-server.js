#!/usr/bin/env node
/**
 * Web 部署服务器启动脚本
 * 支持日志输出到文件，用于生产环境部署
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// 获取部署目录
const deployDir = process.env.DEPLOY_DIR || path.resolve(__dirname, "../../../deploy/app/web");
const logsDir = process.env.LOGS_DIR || path.join(deployDir, "logs");

// 确保日志目录存在
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 日志文件路径
const logFile = path.join(logsDir, `app-${new Date().toISOString().split("T")[0]}.log`);
const errorLogFile = path.join(logsDir, `error-${new Date().toISOString().split("T")[0]}.log`);

// 创建日志写入流
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const errorStream = fs.createWriteStream(errorLogFile, { flags: "a" });

// 日志格式化函数
function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}\n`;
}

// 写入日志的函数
function writeLog(level, message) {
  const formatted = formatLog(level, message);
  logStream.write(formatted);
  if (level === "ERROR" || level === "WARN") {
    errorStream.write(formatted);
  }
}

// 控制台输出并记录日志
function log(level, ...args) {
  const message = args.join(" ");
  console.log(...args);
  writeLog(level, message);
}

// 加载环境变量
const dotenv = require("dotenv");
const envDir = process.env.ENV_DIR || path.resolve(__dirname, "../../../deploy");

const envFiles = [
  `.env.production.local`,
  ".env.local",
  `.env.production`,
  ".env",
];

let loadedEnvFile = null;
for (const envFile of envFiles) {
  const envPath = path.join(envDir, envFile);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      loadedEnvFile = envFile;
      log("INFO", `[deploy-server] 已加载环境文件: ${envFile}`);
      break;
    }
  }
}

if (!loadedEnvFile) {
  log("WARN", `[deploy-server] 警告: 未找到环境文件，使用系统环境变量`);
}

// 设置 NODE_ENV
process.env.NODE_ENV = "production";

// 读取端口和主机配置
const port = process.env.WEB_PORT || process.env.PORT || 3010;
const hostname = process.env.HOSTNAME || "0.0.0.0";

log("INFO", `[deploy-server] 部署目录: ${deployDir}`);
log("INFO", `[deploy-server] 日志目录: ${logsDir}`);
log("INFO", `[deploy-server] 服务将启动在: http://${hostname}:${port}`);

// 切换到部署目录
process.chdir(deployDir);

// 记录启动信息
log("INFO", `[deploy-server] 正在启动 Next.js 服务...`);
log("INFO", `[deploy-server] NODE_ENV=${process.env.NODE_ENV}`);
log("INFO", `[deploy-server] API_URL=${process.env.API_URL || "未设置"}`);

// 启动 Next.js 服务
const nextBin = path.join(deployDir, "node_modules/.bin/next");
const serverPath = path.join(deployDir, "server.js");

// 优先使用 standalone 的 server.js
const useBuiltinServer = fs.existsSync(serverPath);

let child;

if (useBuiltinServer) {
  // 使用 Next.js 内置的 standalone server.js
  log("INFO", `[deploy-server] 使用内置 standalone server.js`);

  // 设置环境变量供 server.js 使用
  process.env.PORT = port;
  process.env.HOSTNAME = hostname;

  // 直接 require server.js
  try {
    require(serverPath);
    log("INFO", `[deploy-server] 服务启动成功`);
  } catch (error) {
    log("ERROR", `[deploy-server] 启动失败: ${error.message}`);
    process.exit(1);
  }
} else {
  // 回退到使用 next start
  log("INFO", `[deploy-server] 使用 next start 命令启动`);
  child = spawn("node", [nextBin, "start", "--port", port, "--hostname", hostname], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: deployDir,
    env: process.env,
    shell: process.platform === "win32",
  });

  // 处理标准输出
  child.stdout.on("data", (data) => {
    const output = data.toString().trim();
    console.log(output);
    writeLog("INFO", output);
  });

  // 处理标准错误
  child.stderr.on("data", (data) => {
    const output = data.toString().trim();
    console.error(output);
    writeLog("ERROR", output);
  });

  // 处理进程退出
  child.on("exit", (code) => {
    log("INFO", `[deploy-server] 服务进程退出，退出码: ${code}`);
    logStream.end();
    errorStream.end();
    process.exit(code);
  });

  // 处理进程错误
  child.on("error", (error) => {
    log("ERROR", `[deploy-server] 服务进程错误: ${error.message}`);
    logStream.end();
    errorStream.end();
    process.exit(1);
  });
}

// 处理优雅关闭
process.on("SIGINT", () => {
  log("INFO", "[deploy-server] 收到 SIGINT 信号，正在关闭...");
  logStream.end();
  errorStream.end();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("INFO", "[deploy-server] 收到 SIGTERM 信号，正在关闭...");
  logStream.end();
  errorStream.end();
  process.exit(0);
});

// 处理未捕获的异常
process.on("uncaughtException", (error) => {
  log("ERROR", `[deploy-server] 未捕获的异常: ${error.message}`);
  log("ERROR", error.stack);
  logStream.end();
  errorStream.end();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  log("ERROR", `[deploy-server] 未处理的 Promise 拒绝: ${reason}`);
  logStream.end();
  errorStream.end();
  process.exit(1);
});
